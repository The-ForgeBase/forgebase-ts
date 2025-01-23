import { serve } from '@hono/node-server';
import { forgeApi, HonoAdapter } from 'api';
import { Hono } from 'hono';

const app = new Hono();

const api = forgeApi({
  prefix: '/api',
  services: {
    db: {
      provider: 'sqlite',
      realtime: false,
      enforceRls: false,
      config: {
        filename: './database.sqlite',
      },
    },
    storage: {
      provider: 'local',
      config: {},
    },
  },
});

app.get('/', (c) => {
  return c.text('Hello Hono!');
});

app.on(['POST', 'GET', 'PUT', 'DELETE'], '/api/**', (c) => {
  const adapter = new HonoAdapter(c);
  return api.handle(adapter);
});

const port = 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
