import { AuthConfig, AuthToken, SessionManager, User } from '../types';
import { Knex } from 'knex';
import { timeStringToDate } from '@forgebase-ts/common';
import * as jose from 'jose';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Interface for key storage options
 */
export interface KeyStorageOptions {
  /**
   * Directory to store keys
   * @default './.keys'
   */
  keyDirectory?: string;

  /**
   * Key ID for the current key pair
   * @default generated UUID
   */
  kid?: string;

  /**
   * JWT algorithm to use for signing
   * @default 'RS256'
   */
  algorithm?: string;

  /**
   * Key rotation interval in days
   * @default 90
   */
  rotationDays?: number;
}

/**
 * JoseJwtSessionManager implements SessionManager interface using jose for asymmetric key signing.
 * This allows external services to verify tokens without contacting the auth API.
 *
 * @class JoseJwtSessionManager
 * @implements {SessionManager}
 */
export class JoseJwtSessionManager implements SessionManager {
  private config: AuthConfig;
  private knex: Knex;
  private privateKey: any | Uint8Array | null = null;
  // this is a workaround for jose types in build
  // private publicKey: jose.KeyLike | Uint8Array | null = null;
  private publicKey: any | Uint8Array | null = null;
  private keyId: string;
  private algorithm: string;
  private keyDirectory: string;
  private rotationInterval: number;
  private publicJwk: jose.JWK | null = null;

  /**
   * Creates an instance of JoseJwtSessionManager.
   *
   * @param {AuthConfig} config - Auth configuration
   * @param {Knex} knex - Knex database connection
   * @param {KeyStorageOptions} keyOptions - Options for key storage and configuration
   */
  constructor(
    config: AuthConfig,
    knex: Knex,
    keyOptions: KeyStorageOptions = {}
  ) {
    this.config = config;
    this.knex = knex;
    this.keyId = keyOptions.kid || crypto.randomUUID();
    this.algorithm = keyOptions.algorithm || 'RS256';
    this.keyDirectory = keyOptions.keyDirectory || './.keys';
    this.rotationInterval =
      (keyOptions.rotationDays || 90) * 24 * 60 * 60 * 1000; // Convert days to milliseconds

    // Ensure key directory exists
    if (!fs.existsSync(this.keyDirectory)) {
      fs.mkdirSync(this.keyDirectory, { recursive: true });
    }
  }

  /**
   * Initialize the session manager by loading or generating keys
   */
  public async initialize(): Promise<void> {
    try {
      await this.loadOrGenerateKeys();
    } catch (error) {
      console.error('Error initializing JoseJwtSessionManager:', error);
      throw new Error('Failed to initialize JoseJwtSessionManager');
    }
  }

  /**
   * Create a new session for a user
   *
   * @param {User} user - User to create a session for
   * @returns {Promise<AuthToken>} Token object containing access and refresh tokens
   */
  async createSession(user: User): Promise<AuthToken> {
    if (!this.privateKey) {
      await this.initialize();
    }

    // Generate payload
    const payload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = await this.generateSignedJwt(
      payload,
      this.config.sessionSettings.accessTokenTTL
    );

    const refreshToken = await this.generateSignedJwt(
      payload,
      this.config.sessionSettings.refreshTokenTTL
    );

    await this.knex('refresh_tokens').insert({
      token: refreshToken,
      user_id: user.id,
      expires_at: timeStringToDate(this.config.sessionSettings.refreshTokenTTL),
    });

    await this.knex('access_tokens').insert({
      token: accessToken,
      user_id: user.id,
      kid: this.keyId,
      expires_at: timeStringToDate(this.config.sessionSettings.accessTokenTTL),
    });

    await this.knex('users')
      .where({ id: user.id })
      .update({ last_login_at: new Date() });

    return { accessToken, refreshToken };
  }

  /**
   * Refresh a session using a refresh token
   *
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<AuthToken>} New token pair
   */
  async refreshSession(refreshToken: string): Promise<AuthToken> {
    const tokenRecord = await this.knex('refresh_tokens')
      .where({ token: refreshToken })
      .where('expires_at', '>', new Date())
      .first();

    if (!tokenRecord) throw new Error('Invalid refresh token');

    // Rotate refresh token
    await this.knex('refresh_tokens').where({ token: refreshToken }).delete();

    // Delete expired tokens
    await this.knex('access_tokens')
      .where('expires_at', '<=', new Date())
      .delete();

    await this.knex('refresh_tokens')
      .where('expires_at', '<=', new Date())
      .delete();

    const user = await this.knex('users')
      .where({ id: tokenRecord.user_id })
      .first();

    return this.createSession(user);
  }

  /**
   * Verify a session token
   *
   * @param {string} token - JWT token to verify
   * @returns {Promise<{ user: User; token?: string | AuthToken }>} User and optionally new token if refreshed
   */
  async verifySession(
    token: string
  ): Promise<{ user: User; token?: string | AuthToken }> {
    try {
      // Try to verify with jose first
      const verified = await this.verifyJwt(token);
      const userId = verified.payload.sub as string;

      const user = await this.knex('users').where({ id: userId }).first();

      if (!user) throw new Error('Invalid access token');

      // Check if token exists in the database (optional: remove for fully stateless validation)
      const accessToken = await this.knex('access_tokens')
        .where({ token })
        .where('expires_at', '>', new Date())
        .first();

      if (!accessToken) {
        // This is a valid JWT but not in our database - possible token reuse or revoked token
        // We can either reject it or issue a new token pair
        const refreshToken = await this.knex('refresh_tokens')
          .where({ user_id: userId })
          .where('expires_at', '>', new Date())
          .first();

        if (!refreshToken) throw new Error('Invalid access token');

        // Remove the current refresh token
        await this.knex('refresh_tokens')
          .where({ token: refreshToken.token })
          .delete();

        // Clean up expired tokens
        await this.knex('access_tokens')
          .where('expires_at', '<=', new Date())
          .delete();

        await this.knex('refresh_tokens')
          .where('expires_at', '<=', new Date())
          .delete();

        // Create a new token pair
        const newToken = await this.createSession(user);
        return { user, token: newToken };
      }

      return { user };
    } catch (verifyError) {
      // If direct verification fails, try the database lookup as backup
      const accessToken = await this.knex('access_tokens')
        .where({ token })
        .where('expires_at', '>', new Date())
        .first();

      if (!accessToken) throw new Error('Invalid access token');

      const user = await this.knex('users')
        .where({ id: accessToken.user_id })
        .first();

      if (!user) throw new Error('Invalid access token');
      return { user };
    }
  }

  /**
   * Destroy a session
   *
   * @param {string} token - Token to destroy
   */
  async destroySession(token: string): Promise<void> {
    await this.knex('access_tokens').where({ token }).delete();
    // Also clean up any expired tokens
    await this.knex('access_tokens')
      .where('expires_at', '<=', new Date())
      .delete();
    await this.knex('refresh_tokens')
      .where('expires_at', '<=', new Date())
      .delete();
  }

  /**
   * Get the public JWK for external verification
   *
   * @returns {jose.JWK | null} Public JWK
   */
  getPublicJwk(): jose.JWK | null {
    return this.publicJwk;
  }

  /**
   * Get public key in PEM format
   *
   * @returns {string | null} Public key in PEM format
   */
  async getPublicKeyPem(): Promise<string | null> {
    if (!this.publicKey) return null;

    if (this.publicKey instanceof CryptoKey) {
      //   const jwk = await jose.exportJWK(this.publicKey);
      const pem = await jose.exportSPKI(this.publicKey);
      return pem;
    }

    return null;
  }

  /**
   * Rotate keys by generating a new key pair
   */
  async rotateKeys(): Promise<void> {
    this.keyId = crypto.randomUUID();
    await this.generateKeyPair();
    console.log(`Key rotated: New key ID ${this.keyId}`);
  }

  /**
   * Load existing keys or generate new ones
   */
  private async loadOrGenerateKeys(): Promise<void> {
    const privateKeyPath = path.join(
      this.keyDirectory,
      `private_${this.keyId}.json`
    );
    const publicKeyPath = path.join(
      this.keyDirectory,
      `public_${this.keyId}.json`
    );

    if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
      try {
        // Load existing keys
        const privateKeyJson = JSON.parse(
          fs.readFileSync(privateKeyPath, 'utf8')
        );
        const publicKeyJson = JSON.parse(
          fs.readFileSync(publicKeyPath, 'utf8')
        );

        this.privateKey = await jose.importJWK(
          privateKeyJson,
          this.algorithm as string
        );
        this.publicKey = await jose.importJWK(
          publicKeyJson,
          this.algorithm as string
        );
        this.publicJwk = publicKeyJson;

        // Check if keys need rotation based on file creation time
        const fileStats = fs.statSync(privateKeyPath);
        const keyAge = Date.now() - fileStats.birthtime.getTime();

        if (keyAge > this.rotationInterval) {
          console.log(
            'Keys are older than rotation interval, generating new keys'
          );
          await this.rotateKeys();
        }
      } catch (error) {
        console.error('Error loading existing keys:', error);
        await this.generateKeyPair();
      }
    } else {
      // Generate new keys
      await this.generateKeyPair();
    }
  }

  /**
   * Generate a new key pair
   */
  private async generateKeyPair(): Promise<void> {
    try {
      // Generate key pair based on algorithm with extractable: true
      let keyPair: CryptoKeyPair;

      if (this.algorithm === 'RS256') {
        keyPair = await jose.generateKeyPair('RS256', {
          modulusLength: 2048,
          extractable: true,
        });
      } else if (this.algorithm === 'ES256') {
        keyPair = await jose.generateKeyPair('ES256', {
          extractable: true,
        });
      } else {
        // Default to ES256
        keyPair = await jose.generateKeyPair('ES256', {
          extractable: true,
        });
      }

      this.privateKey = keyPair.privateKey;
      this.publicKey = keyPair.publicKey;

      // Export keys to JWK format
      const privateJwk = await jose.exportJWK(keyPair.privateKey);
      const publicJwk = await jose.exportJWK(keyPair.publicKey);

      // Add key ID to JWKs
      privateJwk.kid = this.keyId;
      publicJwk.kid = this.keyId;

      this.publicJwk = publicJwk;

      // Save keys to files
      const privateKeyPath = path.join(
        this.keyDirectory,
        `private_${this.keyId}.json`
      );
      const publicKeyPath = path.join(
        this.keyDirectory,
        `public_${this.keyId}.json`
      );

      fs.writeFileSync(privateKeyPath, JSON.stringify(privateJwk, null, 2));
      fs.writeFileSync(publicKeyPath, JSON.stringify(publicJwk, null, 2));

      // Set permissions on private key for security
      fs.chmodSync(privateKeyPath, 0o600);
    } catch (error) {
      console.error('Error generating key pair:', error);
      throw new Error(
        'Failed to generate key pair: ' +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }

  /**
   * Generate a signed JWT
   *
   * @param {Record<string, any>} payload - JWT payload
   * @returns {Promise<string>} Signed JWT
   */
  private async generateSignedJwt(
    payload: Record<string, any>,
    expiresIn: string
  ): Promise<string> {
    if (!this.privateKey || !this.publicJwk) {
      throw new Error('Keys not initialized');
    }

    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({
        alg: this.algorithm as string,
        typ: 'JWT',
        kid: this.keyId,
      })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(this.privateKey);

    return jwt;
  }

  /**
   * Verify a JWT
   *
   * @param {string} token - Token to verify
   * @returns {Promise<jose.JWTVerifyResult>} Verification result
   */
  private async verifyJwt(token: string): Promise<jose.JWTVerifyResult> {
    if (!this.publicKey) {
      throw new Error('Public key not initialized');
    }

    const result = await jose.jwtVerify(token, this.publicKey);
    return result;
  }
}
