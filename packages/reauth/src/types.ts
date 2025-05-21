import { AwilixContainer } from 'awilix';

export type CookieSameSite = 'lax' | 'strict' | 'none';

export interface ValidationResult {
  isValid: boolean;
  errors?: Record<string, string> | undefined;
}

export type ValidationRule<T = any> = (
  value: T,
  input: AuthInput,
) => string | undefined;

export interface ValidationSchema {
  [key: string]: ValidationRule | ValidationRule[];
}

export type HookFunction = (
  input: AuthInput,
  output?: AuthOutput,
) => Promise<void> | void;

export interface AuthStepHooks {
  before?: HookFunction | HookFunction[];
  after?: HookFunction | HookFunction[];
  onError?: (error: Error, input: AuthInput) => Promise<void> | void;
}

export interface AuthStep {
  name: string;
  description: string;
  validationSchema?: ValidationSchema;
  hooks?: AuthStepHooks;
  run(input: AuthInput): Promise<AuthOutput>;
}

export interface AuthInput {
  reqBody?: Record<string, any>;
  reqQuery?: Record<string, any>;
  reqParams?: Record<string, any>;
  reqHeaders?: Record<string, any>;
  reqMethod?: string;
}

export type HooksType = 'before' | 'after' | 'onError';

export interface ReAuthCradle {
  [key: string]: any;
}

export interface AuthPlugin {
  name: string;
  steps: AuthStep[];
  defaultConfig: {
    useCookie?: boolean;
    cookieName?: string;
    cookieOptions?: {
      maxAge: number;
      httpOnly: boolean;
      secure: boolean;
      sameSite: CookieSameSite;
    };
    returnToken?: boolean;
    useRedirect?: boolean;
    redirectUrl?: string;
  };
  requiredInput: {
    reqBody: boolean;
    reqQuery: boolean;
    reqParams: boolean;
    reqHeaders: boolean;
    reqMethod: boolean;
  };

  /**
   * Initialize the plugin with an optional DI container
   * @param container Optional Awilix container for dependency injection
   */
  initialize(container?: AwilixContainer<ReAuthCradle>): Promise<void> | void;

  getStep(step: string): AuthStep | undefined;

  runStep(step: string, input: AuthInput): Promise<AuthOutput>;
}

export class ConfigError extends Error {
  constructor(
    message: string,
    public pluginName: string,
    public data?: any,
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class AuthInputError extends Error {
  constructor(
    message: string,
    public pluginName: string,
    public stepName: string,
    public data?: any,
  ) {
    super(message);
    this.name = 'AuthInputError';
  }
}

export class StepNotFound extends Error {
  constructor(
    step: string,
    public pluginName: string,
  ) {
    super(`Step ${step} not found for plugin ${pluginName}`);
    this.name = 'StepNotFound';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public pluginName: string,
    public stepName: string,
    public hookType?: HooksType,
    public data?: any,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class PluginNotFound extends Error {
  constructor(plugin: string) {
    super(`Plugin ${plugin} not found`);
    this.name = 'PluginNotFound';
  }
}

export class HooksError extends Error {
  data?: any;

  constructor(
    message: string,
    public pluginName: string,
    public stepName: string,
    public hookType: HooksType,
    data?: any,
  ) {
    super(message);
    this.name = 'HooksError';
    this.data = data;
  }
}

export class InitializationError extends Error {
  constructor(
    message: string,
    public pluginName: string,
    public data?: any,
  ) {
    super(message);
    this.name = 'InitializationError';
  }
}

export type BaseUser = {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  picture?: string;
  permissions?: string | string[];
  role?: string;
  labels?: string | string[];
  teams?: string | string[];
  password_hash?: string;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: Date;
  updated_at: Date;
  mfa_enabled: boolean;
  mfa_secret?: string;
  mfa_recovery_codes?: string[];
  last_login_at?: Date;
  // Add other mandatory fields as needed
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UserExtension {}

// Generic type for custom user fields
export type User = BaseUser & UserExtension;

export type AuthToken =
  | {
      accessToken: string;
      refreshToken: string;
    }
  | string;

export type AuthOutput = {
  user?: User;
  token?: AuthToken;
  redirect?: string;
} & Record<string, any>;
