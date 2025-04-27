import { User } from '../types';

/**
 * Authentication response
 */
export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * Email verification response
 */
export interface VerifyEmailResponse {
  success: boolean;
  user?: User;
  token?: string;
}

/**
 * Password reset response
 */
export interface PasswordResetResponse {
  success: boolean;
  message?: string;
}

/**
 * Change password response
 */
export interface ChangePasswordResponse {
  success: boolean;
  message?: string;
}

/**
 * Reset token verification response
 */
export interface VerifyResetTokenResponse {
  valid: boolean;
}
