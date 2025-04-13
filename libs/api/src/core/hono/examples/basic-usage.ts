import { createHonoForgeApi } from '@forgebase-ts/api';
import { serve } from '@hono/node-server';

// Create a Hono app with ForgeBase API
const app = createHonoForgeApi({
  config: {
    prefix: '/api',
    services: {
      db: {
        provider: 'sqlite',
        realtime: true,
        enforceRls: true,
        config: {
          filename: './db.sqlite',
        },
      },
      storage: {
        provider: 'local',
        config: {},
      },
    },
  },
});

// Add your own routes
app.get('/', (c) => c.text('Hello ForgeBase!'));

// Start the server
serve({
  fetch: app.fetch,
  port: 3000,
});
