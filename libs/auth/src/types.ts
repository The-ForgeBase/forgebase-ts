/* eslint-disable @typescript-eslint/no-empty-object-type */
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
  adminFeature: z
    .object({
      enabled: z.boolean().default(false),
      createInitialAdmin: z.boolean().default(true),
      initialAdminEmail: z.string().email().default('admin@example.com'),
      initialAdminPassword: z.string().min(8).default('changeme123'),
    })
    .default({
      enabled: false,
      createInitialAdmin: true,
      initialAdminEmail: 'admin@example.com',
      initialAdminPassword: 'changeme123',
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
  emailVerificationService?: EmailVerificationService<TUser>;
  smsVerificationService?: SmsVerificationService<TUser>;
}

export interface JwksResponse {
  keys: Array<Record<string, any>>;
}

export interface UserService<TUser extends User> {
  findUser(identifier: string): Promise<TUser | null>;
  createUser(user: Partial<TUser>, password?: string): Promise<TUser>;
  updateUser(userId: string, user: Partial<TUser>): Promise<TUser>;
  deleteUser(userId: string): Promise<void>;
  findUserById(userId: string): Promise<TUser | null>;
  findUserByEmail(email: string): Promise<TUser | null>;
  findUserByPhone(phone: string): Promise<TUser | null>;
  getConfig(): AuthConfig;
}

export interface EmailVerificationService<TUser extends User> {
  /**
   * Send a verification email to the user
   * @param email The recipient's email address
   * @param user The user object
   * @param customVerificationUrlBase Optional custom base URL for verification link
   * @returns The generated verification token (optional)
   */
  sendVerificationEmail(
    email: string,
    user: TUser,
    customVerificationUrlBase?: string
  ): Promise<string | void>;

  /**
   * Verify an email verification token
   * @param email The email address to verify
   * @param token The verification token
   * @param user The user object
   * @returns Whether the verification was successful
   */
  verifyEmail(email: string, token: string, user: TUser): Promise<boolean>;

  /**
   * Send a password reset email to the user
   * @param email The recipient's email address
   * @param user The user object
   * @param resetUrl Optional URL for password reset
   * @param customResetUrlBase Optional custom base URL for reset link
   * @returns The generated reset token
   */
  sendPasswordResetEmail(
    email: string,
    user: TUser,
    resetUrl?: string,
    customResetUrlBase?: string
  ): Promise<string>;

  /**
   * Verify a password reset token
   * @param email The email address associated with the token
   * @param token The password reset token
   * @returns Whether the token is valid
   */
  verifyPasswordResetToken(email: string, token: string): Promise<boolean>;

  /**
   * Consume a verification token
   * @param token The verification token
   * @param userId The user ID
   * @returns Whether the token was successfully consumed
   */
  consumePasswordResetToken(token: string, userId: string): Promise<boolean>;
}

export interface SmsVerificationService<TUser extends User> {
  sendVerificationSms(phone: string, user: TUser): Promise<void>;
  verifySms?(token: string, phone: string, user: TUser): Promise<boolean>;
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
  validateToken?(token: string): Promise<User>;
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
