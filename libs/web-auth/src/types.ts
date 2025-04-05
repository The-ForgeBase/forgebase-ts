import { AxiosInstance, AxiosRequestConfig } from 'axios';

/**
 * User interface representing the authenticated user
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  email_verified: boolean;
  created_at: string | Date;
  updated_at: string | Date;
  [key: string]: any;
}

/**
 * Authentication token response
 */
export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
}

/**
 * Registration credentials
 */
export interface RegisterCredentials {
  email: string;
  password: string;
  name?: string;
  [key: string]: any;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  user: User;
  token: string | AuthToken;
  verificationToken?: string;
}

/**
 * Email verification response
 */
export interface VerifyEmailResponse {
  success: boolean;
  user?: User;
  message?: string;
}

/**
 * Password reset response
 */
export interface PasswordResetResponse {
  success: boolean;
  message?: string;
  token?: string;
}

/**
 * Verify reset token response
 */
export interface VerifyResetTokenResponse {
  valid: boolean;
}

/**
 * Storage strategy enum
 */
export enum StorageType {
  COOKIE = 'cookie',
  LOCAL_STORAGE = 'localStorage',
  MEMORY = 'memory',
}

/**
 * Configuration options for the ForgebaseWebAuth SDK
 */
export interface ForgebaseWebAuthConfig {
  /**
   * Base URL of the authentication API
   */
  apiUrl: string;

  /**
   * Storage type to use for persisting tokens
   */
  storageType?: StorageType;

  /**
   * Custom storage implementation
   */
  storage?: AuthStorage;

  /**
   * Cookie domain for cookie storage
   */
  cookieDomain?: string;

  /**
   * Cookie path for cookie storage
   */
  cookiePath?: string;

  /**
   * Whether to use secure cookies
   */
  secureCookies?: boolean;

  /**
   * Whether to use HTTP-only cookies
   */
  httpOnlyCookies?: boolean;

  /**
   * Same-site cookie policy
   */
  sameSite?: 'strict' | 'lax' | 'none';

  /**
   * Optional custom headers to include with all requests
   */
  headers?: Record<string, string>;

  /**
   * Optional timeout for requests in milliseconds (default: 10000)
   */
  timeout?: number;

  /**
   * Whether to use cookies for authentication (default: true)
   */
  useCookies?: boolean;

  /**
   * Whether to include credentials in requests (default: true)
   */
  withCredentials?: boolean;

  /**
   * Whether the SDK is running in an SSR environment
   */
  ssr?: boolean;

  /**
   * Optional request interceptor
   */
  requestInterceptor?: (config: any) => any | Promise<any>;

  /**
   * Optional response interceptor
   */
  responseInterceptor?: (response: any) => any | Promise<any>;

  /**
   * Optional error interceptor
   */
  errorInterceptor?: (error: any) => any | Promise<any>;
}

/**
 * Interface for storage providers
 */
export interface AuthStorage {
  /**
   * Store a value securely
   */
  setItem(key: string, value: string, options?: any): Promise<void> | void;

  /**
   * Retrieve a stored value
   */
  getItem(key: string): Promise<string | null> | string | null;

  /**
   * Remove a stored value
   */
  removeItem(key: string, options?: any): Promise<void> | void;
}

/**
 * Error types
 */
export enum AuthErrorType {
  NETWORK_ERROR = 'network_error',
  INVALID_CREDENTIALS = 'invalid_credentials',
  USER_NOT_FOUND = 'user_not_found',
  EMAIL_ALREADY_EXISTS = 'email_already_exists',
  VERIFICATION_REQUIRED = 'verification_required',
  INVALID_TOKEN = 'invalid_token',
  SERVER_ERROR = 'server_error',
  UNKNOWN_ERROR = 'unknown_error',
  SSR_ERROR = 'ssr_error',
}

/**
 * Custom error class for authentication errors
 */
export class AuthError extends Error {
  type: AuthErrorType;
  statusCode?: number;

  constructor(message: string, type: AuthErrorType, statusCode?: number) {
    super(message);
    this.name = 'AuthError';
    this.type = type;
    this.statusCode = statusCode;
  }
}
