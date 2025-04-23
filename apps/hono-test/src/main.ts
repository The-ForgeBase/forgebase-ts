import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { getRouterName, showRoutes } from 'hono/dev';
import {
  createHonoForgeApi,
  FgAPiVariables,
} from '@forgebase-ts/api/core/hono';
import knex from 'knex';
import { AuthTables } from '@forgebase-ts/auth/config';
import { UserContext } from '@forgebase-ts/database';

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

const { dbService, storageService } = createHonoForgeApi(
  {
    config: {
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
    app,
  },
  {}
);

app.get('/', (c) => {
  return c.text('Hello Hono!');
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
