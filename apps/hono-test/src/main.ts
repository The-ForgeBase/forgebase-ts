import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { getRouterName, showRoutes } from 'hono/dev';
import { createHonoForgeApi } from '@forgebase-ts/api/core/hono';
import knex from 'knex';
// import { AuthTables } from '@forgebase-ts/auth';

const app = new Hono();

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

const { dbService, storageService } = createHonoForgeApi(
  {
    config: {
      prefix: '/api',
      services: {
        db: {
          provider: 'sqlite',
          config: {
            db,
            excludedTables: [],
            enforceRls: true,
            realtime: false,
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
});

const port = 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
