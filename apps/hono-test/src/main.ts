import { serve } from '@hono/node-server';
import { forgeApi, HonoAdapter, type Context } from '@forgebase-ts/api';
import { Hono } from 'hono';
import type { StatusCode } from 'hono/utils/http-status';

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
        pool: {
          min: 2,
          max: 20,
          acquireTimeoutMillis: 30000, // 30 seconds
          createTimeoutMillis: 30000,
          idleTimeoutMillis: 30000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 100,
        },
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

api.use(async (c: Context) => {
  console.log('Handling request:', {
    method: c.req.method,
    path: c.req.path,
  });
});

// Change the route pattern to match all API routes correctly
app.all('/api/*', async (c, next) => {
  await next();
  const adapter = new HonoAdapter(c);
  try {
    console.log('Handling API request:', {
      method: c.req.method,
      path: c.req.path,
      url: c.req.url,
    });

    const {
      context: { res },
    } = await api.handle(adapter);

    c.status(res.status as StatusCode);
    for (const [key, value] of Object.entries(res.headers)) {
      c.header(key, value);
    }
    return c.json(res.body);
  } catch (error: any) {
    console.error('Error handling API request:', error);
    return c.json({ message: 'Internal server error', error }, 500);
  }
});

const port = 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
