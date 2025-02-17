export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'auth/invalid-credentials',
  PROVIDER_NOT_FOUND: 'auth/provider-not-found',
  PROVIDER_DISABLED: 'auth/provider-disabled',
  INVALID_CONFIG: 'auth/invalid-config',
  SESSION_EXPIRED: 'auth/session-expired',
  INVALID_TOKEN: 'auth/invalid-token',
  UNAUTHORIZED: 'auth/unauthorized',
  INVALID_REQUEST: 'auth/invalid-request',
} as const;
