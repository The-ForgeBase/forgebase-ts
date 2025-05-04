/* eslint-disable @typescript-eslint/no-empty-object-type */
import { z } from 'zod';

export const AuthConfigSchema = z.object({
  id: z.number().optional(),
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
      createInitialApiKey: z.boolean().default(false),
      initialApiKeyName: z.string().default('Initial Admin API Key'),
      initialApiKeyScopes: z.array(z.string()).default(['*']),
    })
    .default({
      enabled: false,
      createInitialApiKey: false,
      initialApiKeyName: 'Initial Admin API Key',
      initialApiKeyScopes: ['*'],
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

export interface UserService {
  findUser(identifier: string): Promise<User | null>;
  createUser(user: Partial<User>, password?: string): Promise<User>;
  updateUser(userId: string, user: Partial<User>): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  findUserById(userId: string): Promise<User | null>;
  findUserByEmail(email: string): Promise<User | null>;
  findUserByPhone(phone: string): Promise<User | null>;
  setRole(userId: string, role: string): Promise<void>;
  removeRTP(
    userId: string,
    list: string[],
    type: 'teams' | 'permissions' | 'labels'
  ): Promise<string[]>;
  addRTP(
    userId: string,
    list: string[],
    type: 'teams' | 'permissions' | 'labels'
  ): Promise<string[]>;
  setRTP(
    userId: string,
    list: string[],
    type: 'teams' | 'permissions' | 'labels'
  ): Promise<string[]>;
}

export interface EmailVerificationService {
  /**
   * Send a verification email to the user
   * @param email The recipient's email address
   * @param user The user object
   * @param customVerificationUrlBase Optional custom base URL for verification link
   * @returns The generated verification token (optional)
   */
  sendVerificationEmail(
    email: string,
    user: User,
    customVerificationUrlBase?: string
  ): Promise<string | void>;

  /**
   * Verify an email verification token
   * @param email The email address to verify
   * @param token The verification token
   * @param user The user object
   * @returns Whether the verification was successful
   */
  verifyEmail(email: string, token: string, user: User): Promise<boolean>;

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
    user: User,
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

export interface SmsVerificationService {
  sendVerificationSms(phone: string, user: User): Promise<void>;
  verifySms?(token: string, phone: string, user: User): Promise<boolean>;
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
  initialize?(): Promise<void | boolean>;
  getConfig(): Promise<AuthConfig>;
  updateConfig(update: Partial<AuthConfig>): Promise<AuthConfig>;
}

export interface BaseUser {
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
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UserExtension {}

// Generic type for custom user fields
export type User = BaseUser & UserExtension;

export interface AuthProvider {
  authenticate(credentials: Record<string, string>): Promise<User | null>;
  validate?(token: string): Promise<User>;
  register?(user: Partial<User>, password: string): Promise<User>;
  getConfig?(): Promise<Record<string, string>>;
  initialize?(): Promise<void>;
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
  initialize?(): Promise<void>;
  createSession(user: User): Promise<AuthToken | string>;
  destroySession(token: string, id?: string): Promise<void>;
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
