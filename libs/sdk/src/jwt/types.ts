/**
 * Configuration options for JWTVerifier
 */
export interface JWTVerifierOptions {
  /**
   * URL of the JWKS endpoint
   * @example 'https://api.yourdomain.com/.well-known/jwks.json'
   */
  jwksUrl: string;

  /**
   * Client identifier for JWKS endpoint authentication
   * This helps restrict access to only registered clients
   * @example 'my-service-client-id'
   */
  clientId: string;

  /**
   * How long to cache the JWKS in milliseconds
   * @default 3600000 (1 hour)
   */
  cacheTimeMs?: number;

  /**
   * Whether to automatically retry failed JWKS fetches
   * @default true
   */
  retryOnFail?: boolean;

  /**
   * Maximum number of retry attempts for JWKS fetch
   * @default 3
   */
  maxRetries?: number;
}

/**
 * Result of token verification
 */
export interface VerificationResult<T = Record<string, unknown>> {
  /**
   * Whether the token is valid
   */
  isValid: boolean;

  /**
   * The decoded and verified token payload
   * Only present if isValid is true
   */
  payload?: T;

  /**
   * Error message if verification failed
   * Only present if isValid is false
   */
  error?: string;
}

/**
 * Standard JWT payload fields
 * Extend this interface to add your custom payload fields
 */
export interface StandardJWTPayload {
  /**
   * Subject (usually user ID)
   */
  sub?: string;

  /**
   * Issued at timestamp
   */
  iat?: number;

  /**
   * Expiration timestamp
   */
  exp?: number;

  /**
   * JWT ID
   */
  jti?: string;

  /**
   * Issuer
   */
  iss?: string;

  /**
   * Audience
   */
  aud?: string | string[];

  /**
   * Not before timestamp
   */
  nbf?: number;
}
