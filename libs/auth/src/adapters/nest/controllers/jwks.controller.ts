import { Controller, Get } from '@nestjs/common';
import { JwksService } from '../services/jwks.service';
import { JwksResponse } from '../../../types';

/**
 * NestJS controller for exposing JWKS endpoints
 */
@Controller()
export class JwksController {
  constructor(private jwksService: JwksService) {}

  /**
   * Get the JSON Web Key Set containing the public key for JWT verification
   * This endpoint follows the JWKS standard format and can be used by external services
   * to verify tokens without contacting the auth API.
   *
   * @returns {JwksResponse} JWKS containing the public keys
   */
  @Get('.well-known/jwks.json')
  getJwks(): JwksResponse {
    return this.jwksService.getJwks();
  }

  /**
   * Get the public key in PEM format
   * This is an alternative format that some services might require
   *
   * @returns {Promise<{key: string | null}>} Public key in PEM format
   */
  @Get('.well-known/public-key.pem')
  async getPublicKeyPem(): Promise<{ key: string | null }> {
    const key = await this.jwksService.getPublicKeyPem();
    return { key };
  }
}
