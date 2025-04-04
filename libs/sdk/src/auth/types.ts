import type { StorageAdapter } from './storage';

/**
 * Base User interface with required fields that must be present
 */
export interface BaseUser {
  id: string;
  email: string;
  name?: string;
  email_verified?: boolean;
  phone?: string;
  phone_verified?: boolean;
  picture?: string;
  mfa_enabled?: boolean;
}

/**
 * Auth Token response structure
 */
export interface AuthToken {
  accessToken: string;
  refreshToken: string;
}

/**
 * Required registration credentials that all users must provide
 */
export interface BaseRegisterCredentials {
  email: string;
  password: string;
}

/**
 * Registration credentials type that can be extended with additional user fields
 */
export type RegisterCredentials<
  T extends Record<string, unknown> = Record<string, unknown>
> = BaseRegisterCredentials & Partial<Omit<T, keyof BaseRegisterCredentials>>;

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Auth response structure
 */
export interface AuthResponse<T extends BaseUser = BaseUser> {
  user?: T;
  token?: AuthToken | string;
  message?: string;
  error?: string;
}

/**
 * Email verification payload
 */
export interface EmailVerificationPayload {
  userId: string;
  code: string;
}

/**
 * Token handling configuration
 */
export interface TokenHandlingConfig {
  /**
   * Whether to include tokens in headers
   * If false, relies entirely on cookies set by the server
   * @default true
   */
  includeTokenHeader?: boolean;

  /**
   * Custom header names if using header-based tokens
   */
  headers?: {
    /**
     * Header name for the access token
     * @default 'Authorization'
     */
    authorization?: string;
    /**
     * Header name for the refresh token
     * @default 'RToken'
     */
    refreshToken?: string;
  };
}

/**
 * Auth client configuration
 */
export interface AuthClientConfig {
  baseUrl: string;
  paths?: {
    login?: string;
    register?: string;
    refresh?: string;
    verifyEmail?: string;
    logout?: string;
    user?: string;
  };
  storage?: StorageAdapter;
  httpClient?: {
    headers?: Record<string, string>;
    credentials?: RequestCredentials;
  };
  /**
   * Token handling configuration
   */
  tokens?: TokenHandlingConfig;
}
