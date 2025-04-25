import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { showRoutes } from 'hono/dev';
import { FgAPiVariables } from '@forgebase-ts/api/core/hono';
import { createIttyHandler, websseHandler } from '@forgebase-ts/api/core/web';
import knex from 'knex';
import { AuthTables } from '@forgebase-ts/auth/config';
import { SSEManager, UserContext } from '@forgebase-ts/database';

// Define a type for our custom environment, extending FgAPiVariables
type MyEnv = {
  Variables: FgAPiVariables & {
    // Use intersection type (&) to merge with FgAPiVariables
    jwtPayload: Record<string, unknown>;
    jwtUser?: {
      userId: string | number;
      role: string;
    };
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

app.use('/api/*', async (c, next) => {
  // Store user context in a variable to pass to the database service
  const userContext: UserContext = {
    userId: '1',
    role: 'user',
    labels: [],
    teams: [],
    permissions: [],
  };

  // We'll use this in the database service later
  c.set('userContext', userContext);

  await next();
});

const webHandler = createIttyHandler({
  config: {
    enableSchemaEndpoints: true,
    enableDataEndpoints: true,
    enablePermissionEndpoints: true,
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

// const { dbService, storageService } = createHonoForgeApi(
//   {
//     config: {
//       prefix: '/api',
//       services: {
//         db: {
//           provider: 'sqlite',
//           config: {
//             db,
//             excludedTables: [...AuthTables],
//             enforceRls: true,
//             realtime: true,
//             initializePermissions: true,
//             onPermissionInitComplete(report) {
//               console.log(report);
//             },
//           },
//         },
//         storage: {
//           provider: 'local',
//           config: {},
//         },
//       },
//     },
//     app,
//   },
//   {}
// );

app.get('/', (c) => {
  return c.text('Hello Hono!');
});

app.get('/api/sse', async (c) => {
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
  return webHandler.handleRequest(ctx.req.raw as any);
});

showRoutes(app, {
  verbose: true,
  colorize: true,
});

const port = 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
