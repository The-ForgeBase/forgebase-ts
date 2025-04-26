import { createHonoForgeApi } from '../forge-api.factory';
import { serve } from '@hono/node-server';
import { jwt } from 'hono/jwt';
import { Hono } from 'hono';

// Define a type for our custom environment
type MyEnv = {
  Variables: {
    jwtPayload: Record<string, unknown>;
    jwtUser?: {
      userId: string | number;
      role: string;
    };
  };
};

// Create a typed Hono app
const customApp = new Hono<MyEnv>();

// Add JWT middleware
customApp.use('*', jwt({ secret: 'your-secret-key' }));

// Add user context middleware
customApp.use('/api/*', async (c, next) => {
  // Get user from JWT payload
  const user = c.get('jwtPayload') as { id: string | number; role: string };

  // Store user context in a variable to pass to the database service
  const userContext = {
    userId: user.id,
    role: user.role,
  };

  // We'll use this in the database service later
  c.set('jwtUser', userContext);

  await next();
});

// Create a Hono app with ForgeBase API
const { app, dbService, storageService } = createHonoForgeApi(
  {
    config: {
      prefix: '/api',
      auth: {
        enabled: true,
        exclude: ['/auth/login', '/auth/register'],
      },
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
    app: customApp, // Pass the custom app with JWT middleware
  },
  {}
);

// Add authentication routes to the custom app
customApp.post('/auth/login', async (c) => {
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

// Log database and storage service information
console.log('Database service initialized:', !!dbService);
console.log('Storage service initialized:', !!storageService);

// Start the server
serve({
  fetch: customApp.fetch,
  port: 3000,
});
