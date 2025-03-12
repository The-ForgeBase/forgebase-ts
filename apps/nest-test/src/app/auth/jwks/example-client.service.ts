import { Injectable } from '@nestjs/common';
import { TokenVerifier } from '@forgebase-ts/auth';

/**
 * ExampleClientService demonstrates how external services can verify tokens
 * using the JWKS endpoint without contacting the auth API directly.
 *
 * In a real-world scenario, this would be in a different microservice or application.
 */
@Injectable()
export class ExampleClientService {
  private tokenVerifier: TokenVerifier;

  constructor() {
    // In a real external service, this would point to your auth service URL
    this.tokenVerifier = new TokenVerifier({
      jwksUrl: 'http://localhost:3000/.well-known/jwks.json',
      cacheTimeMs: 3600000, // Cache JWKS for 1 hour
    });
  }

  /**
   * Verify a JWT token using the public key from the JWKS endpoint
   *
   * @param token JWT token to verify
   * @returns Verification result with user data
   */
  async verifyToken(token: string) {
    try {
      const { payload } = await this.tokenVerifier.verifyToken(token);

      return {
        isValid: true,
        userId: payload.sub,
        email: payload.email,
        payload,
      };
    } catch (error) {
      console.error('Token verification failed:', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Extract payload from a token without verification
   * Useful for debugging or when you only need the data and don't care about validity
   *
   * @param token JWT token
   * @returns Decoded payload without verification
   */
  extractPayload(token: string) {
    return this.tokenVerifier.extractPayload(token);
  }
}
