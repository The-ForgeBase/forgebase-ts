import { createHonoForgeApi } from '@forgebase-ts/api';
import { serve } from '@hono/node-server';
import { jwt } from 'hono/jwt';

// Create a Hono app with ForgeBase API
const app = createHonoForgeApi({
  config: {
    prefix: '/api',
    auth: {
      enabled: true,
      exclude: ['/auth/login', '/auth/register'],
    },
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

// Add JWT middleware
app.use('/api/*', jwt({ secret: 'your-secret-key' }));

// Add authentication routes
app.post('/auth/login', async (c) => {
  const { username, password } = await c.req.json();
  
  // Authenticate user (replace with your own logic)
  if (username === 'admin' && password === 'password') {
    return c.json({
      token: 'your-jwt-token',
      user: {
        id: 1,
        username: 'admin',
        role: 'admin',
      },
    });
  }
  
  return c.json({ error: 'Invalid credentials' }, 401);
});

// Start the server
serve({
  fetch: app.fetch,
  port: 3000,
});
