import { createContainer, asClass, asValue, InjectionMode } from 'awilix';
import { Knex } from 'knex';
import { InternalAdminManager } from './admin/internal-admin-manager';
import { KnexAdminService } from './services/admin.knex.service';
import { AdminApiKeyService } from './services/admin-api-key.service';
import { AdminAuthProvider, AdminSessionManager } from './types/admin';
import {
  AuthProvider,
  ConfigStore,
  EmailVerificationService,
  SessionManager,
  SmsVerificationService,
  UserService,
} from './types';
import { KnexAdminSessionManager } from './services/admin-session.service';
import {
  BasicAdminAuthProvider,
  PlunkEmailVerificationService,
  PlunkVerificationConfig,
} from './services';
import { KnexConfigStore } from './config';
import { DynamicAuthManager } from './authManager';
import { KnexUserService } from './userService';
import { AuthPlugin } from './plugins';
import { SignOptions } from 'jsonwebtoken';
import { BasicSessionManager, JwtSessionManager } from './session';
import {
  BaseOAuthProvider,
  LocalAuthProvider,
  PasswordlessProvider,
} from './providers';

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
  plugins: AuthPlugin[];
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
    plugins: deps.plugins ? asValue(deps.plugins) : asValue([]),
    emailVerificationService: deps.email.usePlunk
      ? asClass(PlunkEmailVerificationService)
          .singleton()
          .inject(() => ({
            config: deps.email.usePlunk.config,
          }))
      : deps.email.emailVerificationService
      ? asValue(deps.email.emailVerificationService)
      : undefined,
    smsVerificationService: deps.sms.smsVerificationService
      ? asValue(deps.sms.smsVerificationService)
      : undefined,
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
              options: deps.useJwt.options,
              secret: deps.useJwt.secret,
            }))
        : deps.sessionManager
        ? asValue(deps.sessionManager)
        : asClass(BasicSessionManager).singleton(),

    // Admin settings
    adminConfig: asValue(deps.adminConfig),
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

    localAuthProvider: deps.local.enabled
      ? asClass(LocalAuthProvider).singleton()
      : undefined,
    passwordlessProvider: deps.passwordless?.enabled
      ? asClass(PasswordlessProvider)
          .singleton()
          .inject(() => ({
            config: {
              tokenStore: deps.passwordless?.tokenStore || deps.knex,
              userService:
                deps.passwordless?.userService ||
                deps.userService ||
                container.resolve('userService'),
              sendToken: deps.passwordless.sendToken,
            },
          }))
      : undefined,

    // Register providers
    providers: asValue({
      // Built-in providers
      local: deps.local.enabled
        ? container.resolve('localAuthProvider')
        : undefined,
      passwordless: deps.passwordless?.enabled
        ? container.resolve('passwordlessProvider')
        : undefined,
      // Custom providers
      ...(deps.providers
        ? Object.fromEntries(
            Object.entries(deps.providers)
              .filter(([key]) => !['local', 'passwordless'].includes(key))
              .map(([key, Provider]) => {
                if (typeof Provider === 'function') {
                  // If it's a class/constructor, instantiate with container deps
                  const ProviderClass = Provider as new (config: {
                    userService: UserService;
                    knex: Knex;
                    [key: string]: unknown;
                  }) => AuthProvider;
                  // Build config by resolving dependencies from container when possible
                  const config = {
                    userService: container.resolve('userService'),
                    knex: container.resolve('knex'),
                    // Try to resolve any additional dependencies from container
                    ...(Provider.prototype.config || {}),
                    ...Object.fromEntries(
                      Object.keys(Provider.prototype.config || {}).map(
                        (key) => [
                          key,
                          container.hasRegistration(key)
                            ? container.resolve(key)
                            : Provider.prototype.config[key],
                        ]
                      )
                    ),
                  };

                  return [key, new ProviderClass(config)];
                }
                // If it's already an instance, use as is
                return [key, Provider];
              })
          )
        : {}),
    }),
  });

  return container;
}

// Initialize all services that require it
export async function initializeContainer(
  container: ReturnType<typeof createAuthContainer>
) {
  const configStore = container.cradle.configStore;
  await configStore.initialize();

  const adminManager = container.cradle.adminManager;
  await adminManager.initialize();

  // Initialize auth providers if they need initialization
  const providers = container.cradle.providers;
  const names_of_providers = Object.keys(providers);
  for (const [name, provider] of Object.entries(providers)) {
    if ('initialize' in provider && typeof provider.initialize === 'function') {
      await provider.initialize();
    }
  }

  configStore.updateConfig({
    enabledProviders: names_of_providers,
    adminFeature: {
      enabled: container.cradle.adminConfig.enabled,
      createInitialApiKey: container.cradle.adminConfig.createInitialApiKey,
      initialApiKeyName:
        container.cradle.adminConfig.initialApiKeyName ||
        'Initial Admin API Key',
      initialApiKeyScopes: container.cradle.adminConfig.initialApiKeyScopes || [
        '*',
      ],
    },
    authPolicy: {
      ...container.cradle.authPolicy,
    },
  });

  return container;
}

// Usage example:
/*
const container = createAuthContainer({
  knex: knexInstance,
  authProvider: new MyAuthProvider(),
  sessionManager: new MySessionManager(),
  configStore: new MyConfigStore(),
  adminConfig: {
    initialAdminEmail: 'admin@example.com',
    initialAdminPassword: 'password',
    enabled: true,
    createInitialApiKey: true
  }
});

const adminManager = container.resolve<InternalAdminManager>('adminManager');
*/
