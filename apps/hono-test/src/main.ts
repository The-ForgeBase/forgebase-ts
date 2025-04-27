import { serve } from '@hono/node-server';
import { UpgradeWebSocket } from 'hono/ws';
import { Hono } from 'hono';
import { showRoutes } from 'hono/dev';
import { FgAPiVariables } from '@forgebase-ts/api/core/hono';
import {
  createIttyHandler,
  IttyWebHandler,
  websseHandler,
} from '@forgebase-ts/api/core/web';
import knex from 'knex';
import { AuthTables } from '@forgebase-ts/auth/config';
import { SSEManager } from '@forgebase-ts/database';
import {
  AuthApi,
  initializeAuthClient,
  webAuthApi,
} from '@forgebase-ts/auth/adapters/web';
import { User } from '@forgebase-ts/auth/types';
import nodeRealtime from '@forgebase-ts/real-time/node';

// Define a type for our custom environment, extending FgAPiVariables
type MyEnv = {
  Variables: FgAPiVariables & {
    user: User | null;
  };
};

const app = new Hono<MyEnv>();

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './db.sqlite',
  },
  useNullAsDefault: true,
  pool: {
    min: 0,
    max: 10,
    acquireTimeoutMillis: 60000, // 60 seconds
    createTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
  },
});

const authClientManager = initializeAuthClient({
  admin: {
    enabled: true,
  },
  db,
  authPolicy: {
    emailVerificationRequired: true,
  },
  config: {
    basePath: '/auth',
  },
  email: {
    enabled: true,
    usePlunk: {
      enabled: true,
      config: {
        apiKey: process.env.PLUNK_API_KEY || '',
        fromEmail: 'nexthire@mail.nexthireapp.com',
        fromName: 'NextHire',
        tokenExpiryMinutes: 30,
        resetTokenExpiryMinutes: 60, // 1 hour for password reset tokens

        // Use nodemailer with Plunk SMTP
        useNodemailer: true,

        // URL bases for verification and reset links
        // Note: In a production environment, these should be configurable
        // based on the deployment environment or tenant configuration
        verificationUrlBase: 'http://localhost:3000/verify',
        resetUrlBase: 'http://localhost:3000/reset-password',

        // Use JSX-Email templates
        useJsxTemplates: true,

        // Additional query parameters
        additionalQueryParams: {
          source: 'email',
        },

        // Custom token query parameter name (optional)
        tokenQueryParam: 'token',
      },
    },
  },
  sms: {
    enabled: false,
  },
  local: {
    enabled: true,
  },
  useJWKS: true,
});

let authApiManager: AuthApi | null = null;
let webHandlerManager: IttyWebHandler | null = null;

async function authClient() {
  if (authApiManager) {
    return authApiManager;
  }

  const client = await authClientManager.getClient();

  const auth = webAuthApi({
    authManager: client.authManager,
    adminManager: client.adminManager,
    config: client.config,
    cors: {
      enabled: true,
      corsOptions: {
        origin: '*',
        credentials: true,
      },
    },
  });

  authApiManager = auth;

  return auth;
}

async function webHandlerClient() {
  if (webHandlerManager) {
    return webHandlerManager;
  }
  const client = await authClientManager.getClient();

  const webHandler = createIttyHandler({
    config: {
      enableSchemaEndpoints: true,
      enableDataEndpoints: true,
      enablePermissionEndpoints: true,
      corsOptions: {
        origin: '*',
        credentials: true,
      },
      useFgAuth: {
        enabled: true,
        authManager: client.authManager,
        adminManager: client.adminManager,
        config: client.config,
      },
    },
    fgConfig: {
      prefix: '/api',
      services: {
        db: {
          provider: 'sqlite',
          config: {
            db,
            excludedTables: [...AuthTables],
            enforceRls: true,
            realtime: true,
            initializePermissions: true,
            onPermissionInitComplete(report) {
              console.log(report);
            },
          },
        },
        storage: {
          provider: 'local',
          config: {},
        },
      },
    },
  });

  webHandlerManager = webHandler;

  return webHandler;
}

const realtime = nodeRealtime({}, {});

app.use('/api/*', async (c, next) => {
  const auth = await authClient();

  const session = await auth.getSession(c.req.raw as any);

  const { user, userContext, isAdmin, isSystem } = session;
  // We'll use this in the database service later
  c.set('userContext', userContext);
  c.set('user', user);
  c.set('isAdmin', isAdmin);
  c.set('isSystem', isSystem);

  c.set('session', session);

  await next();
});

app.all('/auth/*', async (ctx) => {
  const auth = await authClient();
  if (!auth) {
    return ctx.text('Auth client not initialized', 500);
  }

  return auth.handleRequest(ctx.req.raw as any);
});

app.get('/', (c) => {
  return c.text('Hello Hono!');
});

app.get('/api/sse', async (c) => {
  const webHandler = await webHandlerClient();
  const userContext = c.get('userContext');
  const realtimeAdapter = webHandler
    .getDatabaseService()
    .getForgeDatabase().realtimeAdapter;
  if (realtimeAdapter && realtimeAdapter instanceof SSEManager) {
    return websseHandler(c.req.raw, userContext, realtimeAdapter);
  }

  return c.text('SSE not enabled', 500);
});

app.post('/api/sse', async (c) => {
  const webHandler = await webHandlerClient();
  const userContext = c.get('userContext');
  const realtimeAdapter = webHandler
    .getDatabaseService()
    .getForgeDatabase().realtimeAdapter;
  if (realtimeAdapter && realtimeAdapter instanceof SSEManager) {
    return websseHandler(c.req.raw, userContext, realtimeAdapter);
  }

  return c.text('SSE not enabled', 500);
});

app.all('/api/*', async (ctx) => {
  const webHandler = await webHandlerClient();
  return webHandler.handleRequest(ctx.req.raw as any);
});

app.all('/live', async ({ req, header }) => {
  if (req.header('Upgrade') === 'websocket') {
    // realtime.handleUpgrade(req.raw)
  }
});

showRoutes(app, {
  verbose: true,
  colorize: true,
});

const port = 3000;
console.log(`Server is running on http://localhost:${port}`);

webHandlerClient();
authClient();

serve({
  fetch: app.fetch,
  port,
});
