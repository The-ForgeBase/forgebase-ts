import {
  AuthRequiredType,
  AuthToken,
  JwksResponse,
  User,
} from '../../../types';
import { DynamicAuthManager } from '../../../authManager';
import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { JoseJwtSessionManager } from '../../../session/jose-jwt';

@Injectable()
export class AuthService<TUser extends User> {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject('AUTH_MANAGER') private authManager: DynamicAuthManager<TUser>,
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

  async register(
    provider: string,
    credentials: Partial<TUser>,
    password: string
  ): Promise<{
    user?: TUser;
    token: AuthToken | string | AuthRequiredType;
    url?: URL;
  }> {
    return this.authManager.register(provider, credentials, password);
  }

  async login(
    provider: string,
    credentials: Record<string, string>
  ): Promise<{
    user?: TUser;
    token: AuthToken | string | AuthRequiredType;
    url?: URL;
  }> {
    return this.authManager.login(provider, credentials);
  }

  async passwordlessLogin(code: string): Promise<{
    user: TUser;
    token: AuthToken | string | AuthRequiredType;
  }> {
    const user = await this.authManager.validateToken(code, 'passwordless');

    if (!user) {
      throw new Error('Invalid code');
    }

    return user as {
      user: TUser;
      token: AuthToken | string | AuthRequiredType;
    };
  }

  async oauthCallback(
    provider: string,
    code: string,
    state: string
  ): Promise<{
    user?: TUser;
    token: AuthToken | string | AuthRequiredType;
  }> {
    return this.authManager.oauthCallback(provider, { code, state });
  }

  async logout(token: string): Promise<void> {
    return this.authManager.logout(token);
  }

  async refreshToken(refreshToken: string) {
    return this.authManager.refreshToken(refreshToken);
  }

  async verifyEmail(userId: string, code: string) {
    return this.authManager.verifyEmail(userId, code);
  }

  async verifySms(userId: string, code: string) {
    return this.authManager.verifySms(userId, code);
  }

  async verifyMfa(userId: string, code: string) {
    return this.authManager.verifyMfa(userId, code);
  }

  async enableMfa(userId: string, code?: string) {
    return this.authManager.enableMfa(userId, code);
  }

  async disableMfa(userId: string, code: string) {
    return this.authManager.disableMfa(userId, code);
  }

  async validateToken(
    token: string,
    provider: string
  ): Promise<{ user: TUser; token?: string | AuthToken }> {
    return this.authManager.validateToken(token, provider);
  }

  getProviderConfig(provider: string) {
    return this.authManager.getProviderConfig(provider);
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
