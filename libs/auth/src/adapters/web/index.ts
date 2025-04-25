import {
  AuthConfig,
  AuthProvider,
  BaseUser,
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
import {
  JoseJwtSessionManager,
  KeyStorageOptions,
} from '../../session/jose-jwt';
import { Knex } from 'knex';
import { DynamicAuthManager } from '../../authManager';
import { initializeAuthSchema, KnexConfigStore } from '../../config';
import { BasicSessionManager, JwtSessionManager } from '../../session';
import { SignOptions } from 'jsonwebtoken';
import { KnexUserService } from '../../userService';
import { createInternalAdminManager, InternalAdminManager } from '../../admin';
import {
  PlunkEmailVerificationService,
  PlunkVerificationConfig,
} from '../../services';
import { AuthApi } from './endpoints/auth';

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

export type AuthClientConfig<TUser extends BaseUser> = {
  db: Knex;
  useJWKS?: boolean;
  useJWT?: {
    secret: string;
    options?: SignOptions;
  };
  sessionSecret?: string;
  keyOptions?: KeyStorageOptions;
  local?: {
    enabled: boolean;
    userService?: UserService<TUser>;
    configStore?: AuthConfig;
  };
  passwordless?: {
    enabled: boolean;
    sendToken: (email: string, token: string) => Promise<void>;
    tokenStore?: Knex;
    userService?: KnexUserService<TUser>;
  };
  providers?: Record<string, BaseOAuthProvider<TUser> | AuthProvider<TUser>>;
  configStore?: ConfigStore;
  sessionManager?: SessionManager;
  userService?: KnexUserService<TUser>;
  authManager?: DynamicAuthManager<TUser>;
  config: WebAuthConfig;
  admin: {
    enabled: boolean;
    jwtSecret?: string;
    tokenExpiry?: string;
    configStore?: ConfigStore;
    initialAdminEmail?: string;
    initialAdminPassword?: string;
    createInitialAdmin?: boolean;
    createInitialApiKey?: boolean;
    initialApiKeyScopes?: string[];
    initialApiKeyName?: string;
  };
  email: {
    enabled: boolean;
    emailVerificationService?: EmailVerificationService<TUser>;
    usePlunk?: {
      enabled: boolean;
      config: PlunkVerificationConfig;
    };
  };
  sms: {
    enabled: boolean;
    smsVerificationService: SmsVerificationService<TUser>;
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

export const createWebAuthClient = async <TUser extends BaseUser>(
  options: AuthClientConfig<TUser>
): Promise<{
  authManager: DynamicAuthManager<TUser>;
  adminManager: InternalAdminManager;
  sessionManager: SessionManager;
  userService: KnexUserService<TUser>;
  configStore: ConfigStore;
  providers: Record<string, BaseOAuthProvider<TUser> | AuthProvider<TUser>>;
  names_of_providers: string[];
}> => {
  await initializeAuthSchema(options.db);

  const configStore = options.configStore || new KnexConfigStore(options.db);
  await configStore.initialize();

  const config = await configStore.getConfig();
  const keyOptions = options.keyOptions || {
    keyDirectory: './keys', // Directory to store keys
    algorithm: 'RS256', // Use RS256 algorithm
    rotationDays: 90, // Key rotation interval
  };
  let sessionManager: SessionManager;

  if (options.sessionManager) {
    sessionManager = options.sessionManager;
  }

  if (options.useJWKS) {
    sessionManager = new JoseJwtSessionManager(config, options.db, keyOptions);
    await sessionManager.initialize();
  } else if (options.useJWT) {
    sessionManager = new JwtSessionManager(
      options.useJWT.secret,
      options.useJWT.options,
      config,
      options.db
    );
  } else if (options.sessionSecret) {
    sessionManager = new BasicSessionManager(
      options.sessionSecret,
      config,
      options.db
    );
  } else {
    throw new Error(
      'No session manager provided, you must choose between useJWKS, useJWT or sessionSecret'
    );
  }

  if (!options.userService && options.providers) {
    throw new Error(
      'No user service provided, you must provide a user service if you want to use OAuth providers'
    );
  }

  const userService =
    options.userService ||
    new KnexUserService<TUser>(config, {
      knex: options.db,
    });

  const providers = {
    local: options.local?.enabled
      ? new LocalAuthProvider<TUser>(
          userService,
          options.local?.configStore || config
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

  let emailVerificationService: EmailVerificationService<TUser>;
  if (options.email.enabled) {
    if (options.email.emailVerificationService) {
      emailVerificationService = options.email.emailVerificationService;
    }
    // TODO: Add more email verification services (Sendgrid, Mailgun, etc.)
    if (options.email.usePlunk) {
      emailVerificationService = new PlunkEmailVerificationService<TUser>(
        options.db,
        {
          ...options.email.usePlunk.config,
        }
      );
    }
  }

  let smsVerificationService: SmsVerificationService<TUser>;
  if (options.sms.enabled) {
    smsVerificationService = options.sms.smsVerificationService;
  }

  const authManager = new DynamicAuthManager<TUser>(
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
        jwtSecret: options.admin.jwtSecret,
        tokenExpiry: options.admin.tokenExpiry,
      }
    );
    await adminManager.initialize();
  }

  const names_of_providers = Object.keys(providers);

  await configStore.updateConfig({
    enabledProviders: names_of_providers,
    adminFeature: {
      enabled: options.admin.enabled,
      initialAdminEmail:
        options.admin.initialAdminEmail || 'admin@yourdomain.com',
      initialAdminPassword:
        options.admin.initialAdminPassword || 'secure-password',
      createInitialAdmin: options.admin.createInitialAdmin || true,
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
  };
};

export const webAuthApi = <TUser extends BaseUser>(options: {
  authManager: DynamicAuthManager<TUser>;
  adminManager: InternalAdminManager;
  config: WebAuthConfig;
}): AuthApi<TUser> => {
  const api = new AuthApi({
    authManager: options.authManager,
    adminManager: options.adminManager,
    config: options.config,
  });

  return api;
};

export * from './endpoints';
