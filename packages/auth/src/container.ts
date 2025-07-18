import { createContainer, asClass, asValue, InjectionMode } from 'awilix';
import { Knex } from 'knex';
import { InternalAdminManager } from './admin/internal-admin-manager.js';
import { KnexAdminService } from './services/admin.knex.service.js';
import { AdminApiKeyService } from './services/admin-api-key.service.js';
import { AdminAuthProvider, AdminSessionManager } from './types/admin.js';
import {
  AuthProvider,
  ConfigStore,
  EmailVerificationService,
  SessionManager,
  SmsVerificationService,
  UserService,
} from './types.js';
import { KnexAdminSessionManager } from './services/admin-session.service.js';
import {
  BasicAdminAuthProvider,
  PlunkEmailVerificationService,
  PlunkVerificationConfig,
} from './services/index.js';
import { KnexConfigStore } from './config/index.js';
import { DynamicAuthManager } from './authManager.js';
import { KnexUserService } from './userService.js';
import { AuthPlugin } from './plugins/index.js';
import { SignOptions } from 'jsonwebtoken';
import { BasicSessionManager, JwtSessionManager } from './session/index.js';
import {
  BaseOAuthProvider,
  LocalAuthProvider,
  PasswordlessProvider,
} from './providers/index.js';

export interface ContainerDependencies {
  knex: Knex;
  adminAuthProvider?: AdminAuthProvider;
  adminSessionManager?: AdminSessionManager;
  configStore?: ConfigStore;
  userService?: UserService;
  sessionManager?: SessionManager;
  useJwt?: {
    secret: string;
    options?: SignOptions;
  };
  local: {
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
  providers?: Record<
    string,
    | BaseOAuthProvider
    | AuthProvider
    | (new (config: {
        userService: UserService;
        knex: Knex;
        [key: string]: unknown;
      }) => BaseOAuthProvider | AuthProvider)
  >;
  refreshInterval?: number;
  enableConfigIntervalCheck?: boolean;
  plugins?: AuthPlugin[];
  adminConfig: {
    initialAdminEmail: string;
    initialAdminPassword: string;
    enabled?: boolean;
    createInitialApiKey: boolean;
    initialApiKeyName?: string;
    initialApiKeyScopes?: string[];
  };
  authPolicy: {
    emailVerificationRequired?: boolean;
    passwordReset?: boolean;
    passwordChange?: boolean;
    accountDeletion?: boolean;
    smsVerificationRequired?: boolean;
    loginAfterRegistration?: boolean;
  };
}

export interface AuthCradle {
  knex: Knex;
  authPolicy: {
    emailVerificationRequired?: boolean;
    passwordReset?: boolean;
    passwordChange?: boolean;
    accountDeletion?: boolean;
    smsVerificationRequired?: boolean;
    loginAfterRegistration?: boolean;
  };
  authManager: DynamicAuthManager;
  refreshInterval: number;
  enableConfigIntervalCheck: boolean;
  emailVerificationService?: EmailVerificationService;
  smsVerificationService?: SmsVerificationService;
  userService: UserService | KnexUserService;
  configStore: ConfigStore;
  sessionManager: SessionManager;
  adminConfig: {
    initialAdminEmail: string;
    initialAdminPassword: string;
    enabled?: boolean;
    createInitialApiKey: boolean;
    initialApiKeyName?: string;
    initialApiKeyScopes?: string[];
  };
  adminAuthProvider: AdminAuthProvider;
  adminSessionManager: AdminSessionManager;
  adminService: KnexAdminService;
  apiKeyService: AdminApiKeyService;
  adminManager: InternalAdminManager;
  localAuthProvider?: LocalAuthProvider;
  passwordlessProvider?: PasswordlessProvider;
  providers: Record<string, BaseOAuthProvider | AuthProvider>;
}

// Create the DI container without initialization
export function createAuthContainer(deps: ContainerDependencies) {
  const container = createContainer<AuthCradle>({
    injectionMode: InjectionMode.CLASSIC,
    strict: true,
  });

  // Register dependencies
  container.register({
    // External dependencies
    knex: asValue(deps.knex),
    authPolicy: asValue(deps.authPolicy),
    authManager: asClass(DynamicAuthManager).singleton(),
    refreshInterval: deps.refreshInterval
      ? asValue(deps.refreshInterval)
      : asValue(5000),
    enableConfigIntervalCheck: deps.enableConfigIntervalCheck
      ? asValue(deps.enableConfigIntervalCheck)
      : asValue(true),
    userService: deps.userService
      ? asValue(deps.userService)
      : asClass(KnexUserService).singleton(),

    configStore: deps.configStore
      ? asValue(deps.configStore)
      : asClass(KnexConfigStore).singleton(),
    sessionManager:
      !deps.sessionManager && deps.useJwt
        ? asClass(JwtSessionManager)
            .singleton()
            .inject(() => ({
              options: deps.useJwt!.options,
              secret: deps.useJwt!.secret,
            }))
        : deps.sessionManager
          ? asValue(deps.sessionManager)
          : asClass(BasicSessionManager).singleton(),

    // Admin settings
    adminAuthProvider: deps.adminAuthProvider
      ? asValue(deps.adminAuthProvider)
      : asClass(BasicAdminAuthProvider).singleton(),
    adminSessionManager: deps.adminSessionManager
      ? asValue(deps.adminSessionManager)
      : asClass(KnexAdminSessionManager)
          .singleton()
          .inject(() => ({
            options: {
              jwtSecret: process.env.JWT_SECRET,
              tokenExpiry: process.env.ADMIN_JWT_TOKEN_EXPIRY,
            },
          })),
    adminService: asClass(KnexAdminService).singleton(),
    apiKeyService: asClass(AdminApiKeyService).singleton(),
    adminManager: asClass(InternalAdminManager).singleton(),
  });

  if (deps.email.enabled && deps.email.usePlunk) {
    container.register({
      emailVerificationService: asClass(PlunkEmailVerificationService)
        .singleton()
        .inject(() => ({
          config: deps.email.usePlunk!.config,
        })),
    });
  }

  if (deps.email.emailVerificationService && !deps.email.usePlunk) {
    container.register({
      emailVerificationService: asValue(deps.email.emailVerificationService),
    });
  }

  if (deps.sms.smsVerificationService) {
    container.register({
      smsVerificationService: asValue(deps.sms.smsVerificationService),
    });
  }

  if (deps.local.enabled) {
    container.register({
      localAuthProvider: asClass(LocalAuthProvider).singleton(),
    });
    container.cradle.authManager.registerProvider(
      'local',
      container.cradle.localAuthProvider!,
    );
  }

  if (deps.passwordless?.enabled) {
    container.register({
      passwordlessProvider: asClass(PasswordlessProvider)
        .singleton()
        .inject(() => ({
          config: {
            tokenStore: deps.passwordless?.tokenStore || deps.knex,
            userService:
              deps.passwordless?.userService ||
              deps.userService ||
              container.resolve('userService'),
            sendToken: deps.passwordless!.sendToken,
          },
        })),
    });
    container.cradle.authManager.registerProvider(
      'passwordless',
      container.cradle.passwordlessProvider!,
    );
  }

  const plugins = deps.plugins;

  if (plugins) {
    plugins.forEach((p) => {
      p.initialize(container.cradle.authManager);
      container.cradle.authManager.registerPlugin(p);
    });
  }

  const configStore = container.cradle.configStore;

  configStore.updateConfig({
    adminFeature: {
      enabled: container.cradle.adminConfig.enabled as boolean,
      createInitialApiKey: container.cradle.adminConfig.createInitialApiKey,
      initialApiKeyName:
        container.cradle.adminConfig.initialApiKeyName ||
        'Initial Admin API Key',
      initialApiKeyScopes: container.cradle.adminConfig.initialApiKeyScopes || [
        '*',
      ],
    },
    authPolicy: {
      ...(container.cradle.authPolicy as any),
    },
  });

  return container;
}
