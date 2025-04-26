import { User } from '../types';

/**
 * List of sensitive fields that should be removed from user objects
 * before sending to clients
 */
const SENSITIVE_USER_FIELDS = [
  'password_hash',
  'mfa_secret',
  'mfa_recovery_codes',
  'password',
  'passwordHash',
  'mfaSecret',
  'mfaRecoveryCodes',
  'recovery_codes',
  'recoveryCodes',
];

/**
 * Sanitizes a user object by removing sensitive fields
 * @param user User object to sanitize
 * @returns Sanitized user object
 */
export function sanitizeUser<T extends User>(user: T): T {
  if (!user) return user;
  
  // Create a shallow copy of the user object
  const sanitizedUser = { ...user };
  
  // Remove sensitive fields
  for (const field of SENSITIVE_USER_FIELDS) {
    if (field in sanitizedUser) {
      delete sanitizedUser[field];
    }
  }
  
  return sanitizedUser;
}

/**
 * Sanitizes an array of user objects by removing sensitive fields
 * @param users Array of user objects to sanitize
 * @returns Array of sanitized user objects
 */
export function sanitizeUsers<T extends User>(users: T[]): T[] {
  if (!users) return users;
  return users.map(user => sanitizeUser(user));
}
