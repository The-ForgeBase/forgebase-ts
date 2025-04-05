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
 * Change password response
 */
export interface ChangePasswordResponse {
  success: boolean;
  message?: string;
}

/**
 * Configuration options for the ForgebaseAuth SDK
 */
export interface ForgebaseAuthConfig {
  /**
   * Base URL of the authentication API
   */
  apiUrl: string;

  /**
   * Storage provider for persisting tokens
   */
  storage: AuthStorage;

  /**
   * Optional custom headers to include with all requests
   */
  headers?: Record<string, string>;

  /**
   * Optional timeout for requests in milliseconds (default: 10000)
   */
  timeout?: number;
}

/**
 * Interface for storage providers
 */
export interface AuthStorage {
  /**
   * Store a value securely
   */
  setItem(key: string, value: string): Promise<void>;

  /**
   * Retrieve a stored value
   */
  getItem(key: string): Promise<string | null>;

  /**
   * Remove a stored value
   */
  removeItem(key: string): Promise<void>;
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
  UNAUTHORIZED = 'unauthorized',
  SERVER_ERROR = 'server_error',
  UNKNOWN_ERROR = 'unknown_error',
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
