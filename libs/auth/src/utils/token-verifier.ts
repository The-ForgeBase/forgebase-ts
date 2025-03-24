import * as jose from 'jose';

/**
 * Options for TokenVerifier
 */
export interface TokenVerifierOptions {
  /**
   * URL of the JWKS endpoint
   */
  jwksUrl: string;

  /**
   * Cache time for JWKS in milliseconds
   * @default 3600000 (1 hour)
   */
  cacheTimeMs?: number;
}

/**
 * TokenVerifier provides a way for external services to verify JWT tokens
 * using the public keys from a JWKS endpoint without contacting the auth API.
 */
export class TokenVerifier {
  private jwksUrl: string;
  private cacheTimeMs: number;
  private jwks: jose.JSONWebKeySet | null = null;
  private lastFetch = 0;

  /**
   * Creates an instance of TokenVerifier
   *
   * @param {TokenVerifierOptions} options - Configuration options
   */
  constructor(options: TokenVerifierOptions) {
    this.jwksUrl = options.jwksUrl;
    this.cacheTimeMs = options.cacheTimeMs || 3600000; // Default to 1 hour
  }

  /**
   * Verify a JWT token
   *
   * @param {string} token - JWT token to verify
   * @returns {Promise<jose.JWTVerifyResult>} Verification result with payload
   * @throws {Error} If token verification fails
   */
  async verifyToken(token: string): Promise<jose.JWTVerifyResult> {
    // Fetch or refresh JWKS if needed
    await this.ensureJwks();

    if (!this.jwks) {
      throw new Error('Failed to load JWKS');
    }

    // Extract header to get key ID (kid)
    const { header } = jose.decodeJwt(token) as {
      header: { kid?: string; alg?: string };
    };

    if (!header.kid) {
      throw new Error('Token missing key ID (kid)');
    }

    // Find the matching key in the JWKS
    const key = this.jwks.keys.find((k) => k.kid === header.kid);
    if (!key) {
      throw new Error(`No matching key found for kid: ${header.kid}`);
    }

    try {
      // Import the JWK as a verification key
      const publicKey = await jose.importJWK(key, header.alg);

      // Verify the token
      const result = await jose.jwtVerify(token, publicKey);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Token verification failed: ${error.message}`);
      }
      throw new Error('Token verification failed');
    }
  }

  /**
   * Extract payload from a JWT token without verification
   *
   * @param {string} token - JWT token
   * @returns {Record<string, any>} Token payload
   */
  extractPayload(token: string): Record<string, any> {
    return jose.decodeJwt(token);
  }

  /**
   * Ensure JWKS is fetched and not expired
   */
  private async ensureJwks(): Promise<void> {
    const now = Date.now();

    // If JWKS is not fetched or cache is expired, fetch it
    if (!this.jwks || now - this.lastFetch > this.cacheTimeMs) {
      try {
        const response = await fetch(this.jwksUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch JWKS: ${response.statusText}`);
        }

        this.jwks = await response.json();
        this.lastFetch = now;
      } catch (error) {
        console.error('Error fetching JWKS:', error);
        throw new Error('Failed to fetch JWKS');
      }
    }
  }
}
