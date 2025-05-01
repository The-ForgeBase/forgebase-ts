import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  initializeAuthSchema,
  User,
  AuthCradle,
  createAuthContainer,
  initializeContainer,
  GoogleOAuthProvider,
} from '@forgebase-ts/auth';
import { Knex } from 'knex';
import { db } from '../app.module';
import { AwilixContainer } from 'awilix';

export interface AppUser extends User {
  name?: string;
  picture?: string;
}

/**
 * Service responsible for configuring and initializing authentication components
 */
@Injectable()
export class AuthConfigService implements OnModuleInit {
  private readonly logger = new Logger(AuthConfigService.name);
  private container: AwilixContainer<AuthCradle>;
  private isInitialized = false;

  /**
   * Automatically initialize the auth components when the module is loaded
   */
  async onModuleInit() {
    this.logger.log('AuthConfigService: Initializing on module init');
    await this.initialize(db);
    this.logger.log('AuthConfigService: Initialization complete');
  }

  /**
   * Initialize authentication components including JoseJwtManager
   *
   * @param db - Knex database instance
   * @returns Object containing initialized managers
   */
  async initialize(db: Knex) {
    try {
      if (this.isInitialized) {
        this.logger.log('AuthConfigService: Already initialized, skipping');
        return this.container;
      }

      this.logger.log('AuthConfigService: Starting initialization');

      // Create all table schemas
      await initializeAuthSchema(db);

      this.container = createAuthContainer({
        knex: db,
        local: {
          enabled: true,
        },
        adminConfig: {
          enabled: true,
          initialAdminEmail: 'admin@example.com',
          initialAdminPassword: 'secure-password',
          createInitialApiKey: true,
          initialApiKeyName: 'Initial Admin API Key',
          initialApiKeyScopes: ['*'],
        },
        authPolicy: {
          emailVerificationRequired: true,
        },
        email: {
          enabled: true,
          usePlunk: {
            enabled: true,
            config: {
              apiKey: process.env.PLUNK_API_KEY || '',
              fromEmail: 'nexthire@mail.nexthireapp.com',
              fromName: 'NextHire',
              tokenExpiryMinutes: 30,
              resetTokenExpiryMinutes: 60, // 1 hour for password reset tokens

              // Use nodemailer with Plunk SMTP
              useNodemailer: true,

              // URL bases for verification and reset links
              // Note: In a production environment, these should be configurable
              // based on the deployment environment or tenant configuration
              verificationUrlBase: 'http://localhost:3000/verify',
              resetUrlBase: 'http://localhost:3000/reset-password',

              // Use JSX-Email templates
              useJsxTemplates: true,

              // Additional query parameters
              additionalQueryParams: {
                source: 'email',
              },

              // Custom token query parameter name (optional)
              tokenQueryParam: 'token',
            },
          },
        },
        sms: {
          enabled: false,
        },
        passwordless: {
          enabled: true,
          sendToken: async (email: string, token: string) => {
            console.log(`Sending token to ${email}: ${token}`);
            // Implement your email sending logic here
          },
        },
      });

      // Initialize auth providers
      // const providers = {
      //   google: new GoogleOAuthProvider({
      //     clientID: process.env.GOOGLE_CLIENT_ID || '',
      //     clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      //     callbackURL: 'http://localhost:3000/auth/oauth/callback',
      //     scopes: ['email', 'profile'],
      //     name: 'google',
      //   }),
      // };

      this.logger.log(
        'AuthConfigService: All components initialized successfully'
      );

      await initializeContainer(this.container);

      // Create Google provider with dependencies from container
      const googleProvider = new GoogleOAuthProvider({
        clientID: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        callbackURL: 'http://localhost:3000/auth/oauth/callback',
        scopes: ['email', 'profile'],
        name: 'google',
        userService: this.container.cradle.userService,
        knex: this.container.cradle.knex,
      });

      // Register the provider with the auth manager
      const authManager = this.container.cradle.authManager;
      authManager.registerProvider('google', googleProvider);

      this.isInitialized = true;

      return this.container;
    } catch (error) {
      this.logger.error(
        `AuthConfigService: Initialization failed: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Get the authentication manager
   * @returns DynamicAuthManager instance
   */
  getAuthManager() {
    if (!this.isInitialized || !this.container) {
      this.logger.warn(
        'AuthConfigService: getAuthManager called before initialization'
      );
    }
    return this.container.cradle.authManager;
  }
}
