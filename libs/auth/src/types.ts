import { Knex } from 'knex';
import { z } from 'zod';

export const AuthConfigSchema = z.object({
  id: z.any().optional(),
  enabledProviders: z.array(z.string()).default(['local']),
  authPolicy: z.object({
    emailVerificationRequired: z.boolean().default(true),
    passwordReset: z.boolean().default(true),
    passwordChange: z.boolean().default(true),
    accountDeletion: z.boolean().default(true),
    smsVerificationRequired: z.boolean().default(true),
    loginAfterRegistration: z.boolean().default(false),
  }),
  passwordPolicy: z.object({
    minLength: z.number().min(8).default(12),
    requireUppercase: z.boolean().default(true),
    requireLowercase: z.boolean().default(true),
    requireNumber: z.boolean().default(true),
    requireSpecialChar: z.boolean().default(true),
    maxAttempts: z.number().min(1).default(5),
  }),
  sessionSettings: z.object({
    accessTokenTTL: z.string().default('15m'),
    refreshTokenTTL: z.string().default('7d'),
    tokenRotation: z.boolean().default(true),
    multipleSessions: z.boolean().default(false),
  }),
  mfaSettings: z.object({
    required: z.boolean().default(false),
    allowedMethods: z.array(z.enum(['totp', 'sms', 'email'])).default(['totp']),
  }),
  rateLimiting: z
    .record(
      z.object({
        requests: z.number(),
        interval: z.string(),
      })
    )
    .default({
      login: { requests: 5, interval: '15m' },
      mfa: { requests: 3, interval: '5m' },
    }),
});

export type AuthConfig = z.infer<typeof AuthConfigSchema>;

export interface AuthInternalConfig<TUser extends User> {
  knex: Knex;
  tableName?: string;
  userColumns?: {
    id?: string;
    email?: string;
    phone?: string;
    name?: string;
    smsVerified?: boolean;
    emailVerified?: boolean;
    passwordHash?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  mfaService?: MfaService;
  rateLimiter?: RateLimiter;
  verificationService?: VerificationService;
}

export interface UserService<TUser extends User> {
  findUser(identifier: string): Promise<TUser | null>;
  createUser(user: Partial<TUser>, password?: string): Promise<TUser>;
  updateUser(userId: string, user: Partial<TUser>): Promise<TUser>;
  deleteUser(userId: string): Promise<void>;
}

export interface VerificationService {
  sendVerificationEmail?(email: string): Promise<void>;
  sendVerificationSms?(phone: string): Promise<void>;
  verifyEmail?(email: string, token: string): Promise<boolean>;
  verifySms?(token: string): Promise<boolean>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}
export interface TokenStore {
  saveToken(userId: string, token: string): Promise<void>;
  getToken(userId: string): Promise<string | null>;
  deleteToken(userId: string): Promise<void>;
}

export interface ConfigStore {
  getConfig(): Promise<AuthConfig>;
  updateConfig(update: Partial<AuthConfig>): Promise<AuthConfig>;
}

export interface BaseUser {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  picture?: string;
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
}

// Generic type for custom user fields
export type User<T extends Record<string, unknown> = {}> = BaseUser & T;

export interface AuthProvider<TUser extends User = User> {
  authenticate(credentials: Record<string, string>): Promise<TUser | null>;
  validate?(token: string): Promise<TUser>;
  register?(user: Partial<TUser>, password: string): Promise<TUser>;
  getConfig?(): Promise<Record<string, string>>;
  //   verifyEmail?(token: string): Promise<void>;
  //   sendVerificationEmail?(email: string): Promise<void>;
  //   verifyPhone?(token: string): Promise<void>;
  //   sendVerificationSms?(phone: string): Promise<void>;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
}

export type AuthRequiredType =
  | 'mfa-required'
  | 'sms-required'
  | 'email-required'
  | 'sms-required or email-required';

export interface SessionManager {
  createSession(user: User): Promise<AuthToken | string>;
  destroySession(token: string): Promise<void>;
  verifySession(
    token: string
  ): Promise<{ user: User; token?: string | AuthToken }>;
  refreshSession?(refreshToken: string): Promise<AuthToken | string>;
}

export class UserNotFoundError extends Error {
  constructor(identifier: string) {
    super(`User not found: ${identifier}`);
  }
}

export class InvalidCodeError extends Error {
  constructor() {
    super(`Invalid code error`);
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid credentials');
  }
}

export class RateLimitExceededError extends Error {
  constructor() {
    super('Rate limit exceeded');
  }
}

export class MFARequiredError extends Error {
  constructor() {
    super('MFA required');
  }
}

export class VerificationRequiredError extends Error {
  constructor(name: string) {
    super(`${name.toUpperCase()} verification is required`);
  }
}

export class InvalidMfaCodeError extends Error {
  constructor() {
    super('Invalid MFA code');
  }
}

export class ProviderDoesNotSupportReg extends Error {
  constructor(name: string) {
    super(`Provider ${name} does not support registration`);
  }
}

export class InvalidProvider extends Error {
  constructor() {
    super('Invalid provider');
  }
}

export class ProviderNotEnabled extends Error {
  constructor(name: string) {
    super(`Provider ${name} is not enabled`);
  }
}

export class ProviderNotExist extends Error {
  constructor(name: string) {
    super(`Provider ${name} does not exist`);
  }
}

export class OAuthProviderNotExist extends Error {
  constructor(name: string) {
    super(`OAuth Provider ${name} does not exist`);
  }
}

export class MfaAlreadyEnabledError extends Error {
  constructor(identifier: string) {
    super(`MFA already enabled for user ${identifier}`);
  }
}

export class MfaNotEnabledError extends Error {
  constructor() {
    super('MFA not enabled');
  }
}

export class MfaRecoveryCodeExpiredError extends Error {
  constructor() {
    super('MFA recovery code expired');
  }
}

export class MfaRecoveryCodeInvalid extends Error {
  constructor() {
    super('Invalid verification code');
  }
}

export class UserUnAuthorizedError extends Error {
  constructor(identifier: string, action: string) {
    super(`User ${identifier} is not authorized to perform ${action}`);
  }
}

export interface MfaService {
  generateSecret(email: string): Promise<{ secret: string; uri: string }>;
  verifyCode(secret: string, code: string): boolean;
  generateRecoveryCodes(): string[];
}

export interface RateLimiter {
  recordAttempt(identifier: string): Promise<void>;
  checkLimit(
    identifier: string
  ): Promise<{ allowed: boolean; retryAfter?: number }>;
}

export interface RBACService<TUser extends User> {
  assignRole(userId: string, role: string): Promise<void>;
  hasPermission(userId: string, permission: string): Promise<boolean>;
}
