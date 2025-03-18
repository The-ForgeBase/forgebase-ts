import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { JoseJwtSessionManager } from '../../../session/jose-jwt';
import { JwksResponse } from '../../../controllers/jwks-controller';

/**
 * NestJS service for managing JWKS (JSON Web Key Sets)
 */
@Injectable()
export class JwksService {
  private readonly logger = new Logger(JwksService.name);

  constructor(
    @Inject('JOSE_JWT_MANAGER')
    @Optional()
    private joseJwtManager: JoseJwtSessionManager
  ) {
    // Log initialization state for debugging
    if (!joseJwtManager) {
      this.logger.error(
        'JwksService instantiated with undefined JoseJwtSessionManager'
      );
    } else {
      this.logger.log('JwksService initialized successfully');
    }
  }

  /**
   * Get the JSON Web Key Set containing the public key for token verification
   *
   * @returns {JwksResponse} JWKS response object
   */
  getJwks(): JwksResponse {
    try {
      // Add validation to handle potential initialization issues
      if (!this.joseJwtManager) {
        this.logger.error('JoseJwtSessionManager is not initialized');
        return { keys: [] };
      }

      const publicJwk = this.joseJwtManager.getPublicJwk();

      if (!publicJwk) {
        this.logger.warn('Public JWK is null or undefined');
      }

      return {
        keys: publicJwk ? [publicJwk] : [],
      };
    } catch (error) {
      this.logger.error(
        `Error getting JWKS: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return { keys: [] };
    }
  }

  /**
   * Get the public key in PEM format
   *
   * @returns {Promise<string | null>} Public key in PEM format
   */
  async getPublicKeyPem(): Promise<string | null> {
    try {
      if (!this.joseJwtManager) {
        this.logger.error('JoseJwtSessionManager is not initialized');
        return null;
      }

      return await this.joseJwtManager.getPublicKeyPem();
    } catch (error) {
      this.logger.error(
        `Error getting public key PEM: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    }
  }

  /**
   * Rotate the keys manually
   * Useful for admin operations or scheduled key rotation
   *
   * @returns {Promise<void>}
   */
  async rotateKeys(): Promise<void> {
    try {
      if (!this.joseJwtManager) {
        this.logger.error('JoseJwtSessionManager is not initialized');
        throw new Error('JoseJwtSessionManager is not initialized');
      }

      await this.joseJwtManager.rotateKeys();
      this.logger.log('Key rotation completed successfully');
    } catch (error) {
      this.logger.error(
        `Error rotating keys: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }
}
