import { Controller, Get, Post } from '@nestjs/common';
import { JwksService } from '@forgebase-ts/auth';

/**
 * CustomJwksController demonstrates additional JWKS functionality
 * beyond the standard endpoints provided by the JwksController from forgebase-ts/auth
 */
@Controller('auth/keys')
export class CustomJwksController {
  constructor(private readonly jwksService: JwksService) {}

  /**
   * Get the current public key in both JWK and PEM formats
   * @returns Object containing both JWK and PEM representations of the public key
   */
  @Get('public')
  async getPublicKey() {
    const jwks = this.jwksService.getJwks();
    const pemKey = await this.jwksService.getPublicKeyPem();

    return {
      jwk: jwks.keys[0],
      pem: pemKey,
      message: 'This public key can be used to verify JWT tokens',
    };
  }

  /**
   * Manually trigger key rotation
   * Useful for administrative purposes or in case of key compromise
   *
   * @returns Success message
   */
  @Post('rotate')
  async rotateKeys() {
    await this.jwksService.rotateKeys();
    return {
      success: true,
      message:
        'Keys rotated successfully. External services should fetch the new public key.',
    };
  }
}
