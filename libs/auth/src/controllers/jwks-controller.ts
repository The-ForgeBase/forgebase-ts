import { JoseJwtSessionManager } from '../session/jose-jwt';
import { Request, Response } from 'express';
import { Context } from 'hono';

/**
 * Generic interface for the JWKS response format
 */
export interface JwksResponse {
  keys: Array<Record<string, any>>;
}

/**
 * JwkController provides endpoints for accessing public JWKs for external token verification.
 * It can be used with different web frameworks like Express, Hono, and NestJS.
 */
export class JwkController {
  constructor(private jwtManager: JoseJwtSessionManager) {}

  /**
   * Get the JSON Web Key Set (JWKS) containing public keys for token verification
   *
   * @returns {JwksResponse} JWKS response containing public keys
   */
  getJwks(): JwksResponse {
    const publicJwk = this.jwtManager.getPublicJwk();
    return {
      keys: publicJwk ? [publicJwk] : [],
    };
  }

  /**
   * Express handler for JWKS endpoint
   *
   * @param {Request} _req - Express request
   * @param {Response} res - Express response
   */
  expressHandler = (_req: Request, res: Response): void => {
    res.json(this.getJwks());
  };

  /**
   * Hono handler for JWKS endpoint
   *
   * @param {Context} c - Hono context
   * @returns {Promise<Response>} Hono response
   */
  honoHandler = async (c: Context) => {
    return c.json(this.getJwks());
  };

  /**
   * Get JWKS data for use in NestJS controller
   *
   * @returns {JwksResponse} JWKS response containing public keys
   */
  nestHandler(): JwksResponse {
    return this.getJwks();
  }
}
