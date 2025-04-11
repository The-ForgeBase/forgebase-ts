import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  DynamicAuthManager,
  GoogleOAuthProvider,
  initializeAuthSchema,
  KnexConfigStore,
  KnexUserService,
  LocalAuthProvider,
  PasswordlessProvider,
  User,
  JoseJwtSessionManager,
  KeyStorageOptions,
  PlunkEmailVerificationService,
} from '@forgebase-ts/auth';
import { initializeNestAdminManager } from '@forgebase-ts/auth/adapters/nest';
import { Knex } from 'knex';
import { db } from '../app.module';

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
  private authManager: DynamicAuthManager<AppUser>;
  private joseJwtManager: JoseJwtSessionManager;
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
        return {
          authManager: this.authManager,
          joseJwtManager: this.joseJwtManager,
        };
      }

      this.logger.log('AuthConfigService: Starting initialization');

      // Create all table schemas
      await initializeAuthSchema(db);

      // Initialize config store
      const configStore = new KnexConfigStore(db);
      await configStore.initialize();

      // Initialize auth config
      let config = await configStore.getConfig();

      // Initialize user service
      const userService = new KnexUserService<AppUser>(config, {
        knex: db,
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
      config = await configStore.updateConfig({
        enabledProviders: ['local', 'passwordless', 'google'],
        adminFeature: {
          enabled: true,
          initialAdminEmail: 'admin@yourdomain.com',
          initialAdminPassword: 'secure-password',
          createInitialAdmin: true,
        },
        authPolicy: {
          emailVerificationRequired: false,
        },
      });

      // Configure the options for JoseJwtSessionManager
      const keyOptions: KeyStorageOptions = {
        algorithm: 'RS256', // Use RS256 algorithm for better compatibility
        rotationDays: 90, // Rotate keys every 90 days
      };

      // Initialize JoseJwtSessionManager for JWT key signing
      this.logger.log('AuthConfigService: Creating JoseJwtSessionManager');
      this.joseJwtManager = new JoseJwtSessionManager(config, db, keyOptions);

      this.logger.log('AuthConfigService: Initializing JoseJwtSessionManager');
      await this.joseJwtManager.initialize();
      this.logger.log(
        'AuthConfigService: JoseJwtSessionManager initialized successfully'
      );

      // Verify the public key is available
      const publicJwk = this.joseJwtManager.getPublicJwk();
      if (!publicJwk) {
        this.logger.warn(
          'AuthConfigService: Public JWK not available after initialization'
        );
      } else {
        this.logger.log(
          `AuthConfigService: Public JWK available with kid: ${publicJwk.kid}`
        );
      }

      // Initialize admin manager
      const adminManager = await initializeNestAdminManager({
        knex: db,
        configStore,
        jwtSecret: 'my-secret-key',
        tokenExpiry: '1d',
      });

      if (!adminManager) {
        throw new Error('Failed to initialize admin manager');
      }

      const plunkVerificationService = new PlunkEmailVerificationService(db, {
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
      });

      // Initialize auth manager with the JoseJwtManager
      this.authManager = new DynamicAuthManager(
        configStore,
        providers,
        this.joseJwtManager, // Use jose JWT manager instead of BasicSessionManager
        userService,
        5000,
        true,
        { knex: db, emailVerificationService: plunkVerificationService },
        plunkVerificationService
      );

      this.isInitialized = true;
      this.logger.log(
        'AuthConfigService: All components initialized successfully'
      );

      return {
        authManager: this.authManager,
        adminManager: adminManager,
        joseJwtManager: this.joseJwtManager,
      };
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
    if (!this.isInitialized || !this.authManager) {
      this.logger.warn(
        'AuthConfigService: getAuthManager called before initialization'
      );
    }
    return this.authManager;
  }

  /**
   * Get the JoseJwtSessionManager for JWKS functionality
   * @returns JoseJwtSessionManager instance
   */
  getJoseJwtManager() {
    if (!this.isInitialized || !this.joseJwtManager) {
      this.logger.warn(
        'AuthConfigService: getJoseJwtManager called before initialization'
      );
    }
    return this.joseJwtManager;
  }
}
