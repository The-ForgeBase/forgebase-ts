import { Knex } from 'knex';
import {
  AdminNotFoundError,
  AdminSessionManager,
  InternalAdmin,
} from '../types/admin';
import { KnexAdminService } from './admin.knex.service';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  sub: string;
  role: string;
  exp: number;
}

/**
 * Session manager for admin authentication
 */
export class KnexAdminSessionManager implements AdminSessionManager {
  private readonly tableName = 'internal_admin_sessions';
  private readonly jwtSecret: string;
  private readonly tokenExpiry: string;

  constructor(
    private knex: Knex,
    private adminService: KnexAdminService,
    options: {
      jwtSecret?: string;
      tokenExpiry?: string;
    } = {}
  ) {
    this.jwtSecret =
      options.jwtSecret || crypto.randomBytes(32).toString('hex');
    this.tokenExpiry = options.tokenExpiry || '24h';
  }

  /**
   * Create a session for an admin
   * @param admin Admin to create session for
   * @returns JWT token
   */
  async createSession(admin: InternalAdmin): Promise<string> {
    // Create JWT token
    const payload: JWTPayload = {
      sub: admin.id,
      role: admin.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
    };

    const token = jwt.sign(payload, this.jwtSecret);

    // Store session in database
    await this.knex(this.tableName).insert({
      id: crypto.randomUUID(),
      admin_id: admin.id,
      token: token,
      expires_at: this.knex.raw(`now() + interval '24 hour'`),
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });

    // Update last login timestamp
    await this.adminService.updateLastLogin(admin.id);

    return token;
  }

  /**
   * Verify a session token
   * @param token JWT token to verify
   * @returns Admin associated with the token
   */
  async verifySession(token: string): Promise<{ admin: InternalAdmin }> {
    try {
      // Verify JWT
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;

      // Check if session exists in database
      const session = await this.knex(this.tableName)
        .where({ token })
        .where('expires_at', '>', this.knex.fn.now())
        .first();

      if (!session) {
        throw new Error('Session not found or expired');
      }

      // Get admin
      const admin = await this.adminService.findAdminById(decoded.sub);
      if (!admin) {
        throw new AdminNotFoundError(decoded.sub);
      }

      return { admin };
    } catch (error) {
      throw new Error('Invalid or expired session');
    }
  }

  /**
   * Destroy a session
   * @param token JWT token to destroy
   */
  async destroySession(token: string): Promise<void> {
    await this.knex(this.tableName).where({ token }).delete();
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    await this.knex(this.tableName)
      .where('expires_at', '<', this.knex.fn.now())
      .delete();
  }
}
