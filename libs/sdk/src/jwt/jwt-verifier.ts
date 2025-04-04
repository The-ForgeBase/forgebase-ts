import * as jose from 'jose';
import {
  JWTVerifierOptions,
  StandardJWTPayload,
  VerificationResult,
} from './types';

/**
 * JWTVerifier provides JWT verification using JWKS (JSON Web Key Set) for
 * distributed systems. It automatically handles key rotation and caching.
 *
 * @example
 * ```typescript
 * const verifier = new JWTVerifier({
 *   jwksUrl: 'https://api.yourdomain.com/.well-known/jwks.json'
 * });
 *
 * // Verify a token
 * const result = await verifier.verify<MyPayloadType>(token);
 * if (result.isValid && result.payload) {
 *   console.log('Token verified:', result.payload);
 * }
 * ```
 */
export class JWTVerifier {
  private jwksUrl: string;
  private clientId?: string;
  private cacheTimeMs: number;
  private retryOnFail: boolean;
  private maxRetries: number;
  private jwks: jose.JSONWebKeySet | null = null;
  private lastFetch = 0;
  private retryCount = 0;

  /**
   * Create a new JWTVerifier instance
   *
   * @param options Configuration options
   */
  constructor(options: JWTVerifierOptions) {
    this.jwksUrl = options.jwksUrl;
    this.clientId = options.clientId;
    this.cacheTimeMs = options.cacheTimeMs || 3600000; // 1 hour default
    this.retryOnFail = options.retryOnFail ?? true;
    this.maxRetries = options.maxRetries || 3;
  }

  /**
   * Verify a JWT token
   *
   * @param token The JWT token to verify
   * @returns VerificationResult with payload if valid
   *
   * @example
   * ```typescript
   * interface MyPayload extends StandardJWTPayload {
   *   email: string;
   *   roles: string[];
   * }
   *
   * const result = await verifier.verify<MyPayload>(token);
   * if (result.isValid && result.payload) {
   *   console.log('User email:', result.payload.email);
   * }
   * ```
   */
  async verify<T extends StandardJWTPayload = StandardJWTPayload>(
    token: string
  ): Promise<VerificationResult<T>> {
    try {
      await this.ensureJwks();

      if (!this.jwks) {
        return {
          isValid: false,
          error: 'Failed to load JWKS',
        };
      }

      // Extract header to get key ID (kid)
      const decoded = jose.decodeJwt(token);
      const { header } = decoded as unknown as {
        header: { kid?: string; alg?: string };
      };

      if (!header.kid) {
        return {
          isValid: false,
          error: 'Token missing key ID (kid)',
        };
      }

      // Find the matching key in the JWKS
      const key = this.jwks.keys.find((k) => k.kid === header.kid);
      if (!key) {
        return {
          isValid: false,
          error: `No matching key found for kid: ${header.kid}`,
        };
      }

      // Import the JWK and verify the token
      const publicKey = await jose.importJWK(key, header.alg);
      const result = await jose.jwtVerify(token, publicKey);

      // Safe casting through unknown
      const payload = result.payload as unknown as T;

      // Validate that payload extends StandardJWTPayload
      if (!this.isValidPayload(payload)) {
        return {
          isValid: false,
          error: 'Invalid payload structure',
        };
      }

      return {
        isValid: true,
        payload,
      };
    } catch (error) {
      return {
        isValid: false,
        error:
          error instanceof Error ? error.message : 'Token verification failed',
      };
    }
  }

  /**
   * Extract and decode a JWT payload without verification.
   * WARNING: This does not verify the token's signature!
   *
   * @param token JWT token to decode
   * @returns Decoded token payload
   */
  decode<T extends StandardJWTPayload = StandardJWTPayload>(token: string): T {
    return jose.decodeJwt(token) as T;
  }

  /**
   * Ensure JWKS is fetched and not expired
   */
  private async ensureJwks(): Promise<void> {
    const now = Date.now();

    // If JWKS is not fetched or cache is expired, fetch it
    if (!this.jwks || now - this.lastFetch > this.cacheTimeMs) {
      try {
        const headers: HeadersInit = {
          Accept: 'application/json',
        };

        // Add client identifier header if provided
        if (this.clientId) {
          headers['X-Client'] = this.clientId;
        }

        const response = await fetch(this.jwksUrl, { headers });
        if (!response.ok) {
          throw new Error(`Failed to fetch JWKS: ${response.statusText}`);
        }

        this.jwks = await response.json();
        this.lastFetch = now;
        this.retryCount = 0; // Reset retry counter on success
      } catch (error) {
        if (this.retryOnFail && this.retryCount < this.maxRetries) {
          this.retryCount++;
          // Exponential backoff: 1s, 2s, 4s, etc.
          const delay = Math.min(
            1000 * Math.pow(2, this.retryCount - 1),
            10000
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          return this.ensureJwks();
        }
        throw error;
      }
    }
  }

  /**
   * Type guard to validate payload structure
   */
  private isValidPayload(payload: unknown): payload is StandardJWTPayload {
    if (!payload || typeof payload !== 'object') return false;

    // Basic validation of standard JWT claims
    const p = payload as Record<string, unknown>;

    // Check that required fields are of correct type if present
    if (p.sub !== undefined && typeof p.sub !== 'string') return false;
    if (p.iat !== undefined && typeof p.iat !== 'number') return false;
    if (p.exp !== undefined && typeof p.exp !== 'number') return false;
    if (p.jti !== undefined && typeof p.jti !== 'string') return false;
    if (p.iss !== undefined && typeof p.iss !== 'string') return false;
    if (p.nbf !== undefined && typeof p.nbf !== 'number') return false;

    // Special check for aud which can be string or string[]
    if (p.aud !== undefined) {
      const isValidAud =
        typeof p.aud === 'string' ||
        (Array.isArray(p.aud) && p.aud.every((a) => typeof a === 'string'));
      if (!isValidAud) return false;
    }

    return true;
  }
}
