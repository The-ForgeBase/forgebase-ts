import { createHonoForgeApi } from '../forge-api.factory';
import { serve } from '@hono/node-server';

// Create a Hono app with ForgeBase API
const { app, dbService, storageService } = createHonoForgeApi(
  {
    config: {
      prefix: '/api',
      services: {
        db: {
          provider: 'sqlite',
          config: {
            realtime: true,
            enforceRls: true,
          },
        },
        storage: {
          provider: 'local',
          config: {},
        },
      },
    },
  },
  {}
);

// Add your own routes
app.get('/', (c) => c.text('Hello ForgeBase!'));

// Start the server
serve({
  fetch: app.fetch,
  port: 3000,
});
