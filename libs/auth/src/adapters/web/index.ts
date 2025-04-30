import {
  AuthProvider,
  ConfigStore,
  EmailVerificationService,
  SessionManager,
  SmsVerificationService,
  UserService,
} from '../../types';
import {
  BaseOAuthProvider,
  LocalAuthProvider,
  PasswordlessProvider,
} from '../../providers';
import { Knex } from 'knex';
import { DynamicAuthManager } from '../../authManager';
import { KnexConfigStore } from '../../config';
import { BasicSessionManager, JwtSessionManager } from '../../session';
import { SignOptions } from 'jsonwebtoken';
import { KnexUserService } from '../../userService';
import { createInternalAdminManager, InternalAdminManager } from '../../admin';
import {
  PlunkEmailVerificationService,
  PlunkVerificationConfig,
} from '../../services';
import { AuthApi } from './endpoints/auth';
import { CorsOptions, RequestHandler, ResponseHandler } from 'itty-router';

export type WebAuthConfig = {
  basePath?: string;
  cookieName?: string;
  cookieOptions?: {
    httpOnly?: boolean;
    secure?: boolean;
    maxAge?: number;
    sameSite?: 'lax' | 'strict' | 'none';
    path?: string;
  };
  tokenExpiry?: string;
  jwtSecret?: string;
};

export type AuthClientConfig = {
  db: Knex;
  useJWT?: {
    secret: string;
    options?: SignOptions;
  };
  sessionSecret?: string;
  local?: {
    enabled: boolean;
    userService?: UserService;
    configStore?: ConfigStore;
  };
  passwordless?: {
    enabled: boolean;
    sendToken: (email: string, token: string) => Promise<void>;
    tokenStore?: Knex;
    userService?: KnexUserService;
  };
  providers?: Record<string, BaseOAuthProvider | AuthProvider>;
  configStore?: ConfigStore;
  sessionManager?: SessionManager;
  userService?: KnexUserService;
  authManager?: DynamicAuthManager;
  config: WebAuthConfig;
  admin: {
    enabled: boolean;
    jwtSecret?: string;
    tokenExpiry?: string;
    configStore?: ConfigStore;
    initialAdminEmail?: string;
    initialAdminPassword?: string;
    initialApiKeyScopes?: string[];
    initialApiKeyName?: string;
    createInitialApiKey?: boolean;
  };
  email: {
    enabled: boolean;
    emailVerificationService?: EmailVerificationService;
    usePlunk?: {
      enabled: boolean;
      config: PlunkVerificationConfig;
    };
  };
  sms: {
    enabled: boolean;
    smsVerificationService?: SmsVerificationService;
  };
  authPolicy: {
    emailVerificationRequired?: boolean;
    passwordReset?: boolean;
    passwordChange?: boolean;
    accountDeletion?: boolean;
    smsVerificationRequired?: boolean;
    loginAfterRegistration?: boolean;
  };
};

export const createWebAuthClient = (
  options: AuthClientConfig
): {
  authManager: DynamicAuthManager;
  adminManager: InternalAdminManager;
  sessionManager: SessionManager;
  userService: KnexUserService;
  configStore: ConfigStore;
  providers: Record<string, BaseOAuthProvider | AuthProvider>;
  names_of_providers: string[];
  config: WebAuthConfig;
} => {
  const configStore = options.configStore || new KnexConfigStore(options.db);

  let sessionManager: SessionManager;

  if (options.sessionManager) {
    sessionManager = options.sessionManager;
  }

  if (options.useJWT) {
    sessionManager = new JwtSessionManager(
      options.useJWT.secret,
      options.useJWT.options,
      configStore,
      options.db
    );
  } else if (options.sessionSecret) {
    sessionManager = new BasicSessionManager(
      options.sessionSecret,
      configStore,
      options.db
    );
  } else {
    throw new Error(
      'No session manager provided, you must choose between useJWT or sessionSecret'
    );
  }

  if (!options.userService && options.providers) {
    throw new Error(
      'No user service provided, you must provide a user service if you want to use OAuth providers'
    );
  }

  const userService =
    options.userService ||
    new KnexUserService({
      knex: options.db,
    });

  const providers = {
    local: options.local?.enabled
      ? new LocalAuthProvider(
          userService,
          options.local?.configStore || configStore
        )
      : undefined,
    passwordless: options.passwordless?.enabled
      ? new PasswordlessProvider({
          tokenStore: options.passwordless?.tokenStore || options.db,
          userService: options.passwordless?.userService || userService,
          sendToken: options.passwordless.sendToken,
        })
      : undefined,
    ...options.providers,
  };

  let emailVerificationService: EmailVerificationService;
  if (options.email.enabled) {
    if (options.email.emailVerificationService) {
      emailVerificationService = options.email.emailVerificationService;
    }
    // TODO: Add more email verification services (Sendgrid, Mailgun, etc.)
    if (options.email.usePlunk && options.email.usePlunk.enabled) {
      emailVerificationService = new PlunkEmailVerificationService(options.db, {
        ...options.email.usePlunk.config,
      });
    }
  }

  let smsVerificationService: SmsVerificationService;
  if (options.sms.enabled) {
    if (options.sms.smsVerificationService) {
      smsVerificationService = options.sms.smsVerificationService;
    }
  }

  const authManager = new DynamicAuthManager(
    configStore,
    providers,
    sessionManager,
    userService,
    5000, // config refresh interval
    true, // enable config interval check
    { knex: options.db, emailVerificationService, smsVerificationService }, // internal config
    emailVerificationService,
    smsVerificationService
  );

  let adminManager: InternalAdminManager;

  if (options.admin.enabled) {
    adminManager = createInternalAdminManager(
      options.db,
      options.admin.configStore || configStore,
      {
        enabled: options.admin.enabled,
        initialAdminEmail: options.admin.initialAdminEmail,
        initialAdminPassword: options.admin.initialAdminPassword,
        createInitialApiKey: options.admin.createInitialApiKey,
      },
      {
        jwtSecret: options.admin.jwtSecret,
        tokenExpiry: options.admin.tokenExpiry,
      }
    );
    adminManager.initialize();
  }

  const names_of_providers = Object.keys(providers);

  configStore.updateConfig({
    enabledProviders: names_of_providers,
    adminFeature: {
      enabled: options.admin.enabled,
      createInitialApiKey: options.admin.createInitialApiKey || true,
      initialApiKeyName:
        options.admin.initialApiKeyName || 'Initial Admin API Key',
      initialApiKeyScopes: options.admin.initialApiKeyScopes || ['*'],
    },
    authPolicy: {
      ...options.authPolicy,
    },
  });

  return {
    authManager,
    adminManager,
    sessionManager,
    userService,
    configStore,
    providers,
    names_of_providers,
    config: options.config,
  };
};

export const webAuthApi = (options: {
  authManager: DynamicAuthManager;
  adminManager: InternalAdminManager;
  config: WebAuthConfig;
  beforeMiddlewares?: RequestHandler[];
  finallyMiddlewares?: ResponseHandler[];
  cors: {
    enabled: boolean;
    corsOptions?: CorsOptions;
  };
}): AuthApi => {
  const api = new AuthApi(options);

  return api;
};

export * from './endpoints';
export * from './utils/auth-utils';
