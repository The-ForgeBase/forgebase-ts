import { Injectable } from '@nestjs/common';
import { BasicSessionManager, GoogleOAuthProvider, initializeAuthSchema, KnexConfigStore, KnexUserService, LocalAuthProvider, PasswordlessProvider, User } from '@forgebase-ts/auth';
import { DynamicAuthManager } from '@forgebase-ts/auth';
import { Knex } from 'knex';

export interface AppUser extends User {
  name?: string;
  picture?: string;
}

@Injectable()
export class AuthConfigService {
  private authManager: DynamicAuthManager<AppUser>;

  async initialize(db: Knex) {
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
    });

    // Initialize session manager
    const sessionManager = new BasicSessionManager('my-secret-key', config, db);

    // Initialize auth manager
    this.authManager = new DynamicAuthManager(
      configStore,
      providers,
      sessionManager,
      userService,
      5000,
      true,
      { knex: db }
    );

    return this.authManager;
  }

  getAuthManager() {
    return this.authManager;
  }
}