import { Context, Hono } from 'hono';
import { LocalAuthProvider } from '../providers/local';
import { PasswordlessProvider } from '../providers/passwordless';
import { GoogleOAuthProvider } from '../providers/oauth/google';
import { DynamicAuthManager } from '../authManager';
import { HonoAuthAdapter } from '../adapters/hono';
import { AppUser } from './types';
import knex from 'knex';
import { KnexConfigStore } from '../config';
import { KnexUserService } from '../userService';
import { BasicSessionManager } from '../session/session';
import { initializeAuthSchema } from '../config';

async function setupAuth() {
  // Initialize Knex instance
  const db = knex({
    client: 'sqlite3',
    connection: {
      filename: ':memory:',
    },
    useNullAsDefault: true,
  });

  // Create all table schemas
  await initializeAuthSchema(db);

  // Initialize config store
  const configStore = new KnexConfigStore(db);
  await configStore.initialize();

  // Initialize auth config
  const config = await configStore.getConfig();

  // Initialize user service
  const userService = new KnexUserService<AppUser>(config, {
    knex: db,
    tableName: 'users',
  });

  // Initialize auth providers
  const providers = {
    local: new LocalAuthProvider(userService, config),
    passwordless: new PasswordlessProvider({
      tokenStore: db,
      userService,
      sendToken: async (email: string, token: string) => {
        console.log(`Sending token to ${email}: ${token}`);
        // Implement your email sending logic here
      },
    }),
    google: new GoogleOAuthProvider({
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: 'http://localhost:3000/auth/oauth/callback',
      scopes: ['email', 'profile'],
      userService,
      knex: db,
      name: 'google',
    }),
  };

  // Update config to enable providers
  await configStore.updateConfig({
    enabledProviders: ['local', 'passwordless', 'google'],
    // oauthProviders: {
    //   google: {
    //     clientId: process.env.GOOGLE_CLIENT_ID || '',
    //     clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    //     redirectUrl: '/',
    //     enabled: true,
    //     scopes: ['email', 'profile'],
    //     provider: 'google',
    //   },
    // },
  });

  // Initialize session manager
  const sessionManager = new BasicSessionManager('my-secret-key', config, db);

  // Initialize auth manager
  const authManager = new DynamicAuthManager(
    configStore,
    providers,
    sessionManager,
    userService,
    5000,
    true,
    { knex: db }
  );

  // Initialize Hono app
  const app = new Hono();

  // Initialize Hono auth adapter
  const authAdapter = new HonoAuthAdapter(authManager);

  // Setup auth routes
  authAdapter.setupRoutes(app);

  // Protected route example
  app.get('/protected', authAdapter.authenticate, (c: Context) => {
    return c.json({
      message: 'This is a protected route',
      user: c.get('user'),
    });
  });

  // Start server
  const port = process.env.PORT || 3000;
  console.log(`Server running on port ${port}`);

  return app;
}

export { setupAuth };
