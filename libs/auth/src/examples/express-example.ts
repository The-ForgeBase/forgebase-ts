import express from 'express';
import { Knex, knex } from 'knex';
import { DynamicAuthManager } from '../authManager';
import { ExpressAuthAdapter } from '../adapters/express';
import { LocalAuthProvider } from '../providers/local';
import { PasswordlessProvider } from '../providers/passwordless';
import { GoogleOAuthProvider } from '../providers/oauth/google';
import { KnexConfigStore } from '../config/knex-config';
import { KnexUserService } from '../userService';
import { User } from '../types';
import { BasicSessionManager } from '../session/session';

interface AppUser extends User {
  name?: string;
  picture?: string;
}

async function setupAuth() {
  // Initialize Knex instance
  const db = knex({
    client: 'sqlite3',
    connection: {
      filename: ':memory:',
    },
    useNullAsDefault: true,
  });

  // Create necessary tables
  await db.schema.createTable('users', (table) => {
    table.increments('id');
    table.string('email').unique();
    table.string('password_hash');
    table.string('name');
    table.string('picture');
    table.boolean('email_verified').defaultTo(false);
    table.boolean('phone_verified').defaultTo(false);
    table.string('phone');
    table.boolean('mfa_enabled').defaultTo(false);
    table.string('mfa_secret');
    table.json('mfa_recovery_codes');
    table.timestamps(true, true);
  });

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
    oauthProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        enabled: true,
        scopes: ['email', 'profile'],
        provider: 'google',
      },
    },
  });

  // Initialize session manager (implement your own or use a library)
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

  // Initialize Express app
  const app = express();
  app.use(express.json());

  // Initialize Express auth adapter
  const authAdapter = new ExpressAuthAdapter(authManager);

  // Setup auth routes
  authAdapter.setupRoutes(app);

  // Protected route example
  app.get(
    '/protected',
    async (req, res, next) => {
      await authAdapter.authenticate(req, res, next);
    },
    (req, res) => {
      res.json({ message: 'This is a protected route', user: req['user'] });
    }
  );

  // Start server
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

// Run the example
setupAuth().catch(console.error);
