import { Injectable, Inject } from '@nestjs/common';
import { AdminApiKey, InternalAdmin } from '../../../admin';
import { type AwilixContainer } from 'awilix';
import { AuthCradle } from '../../../container';

@Injectable()
export class AdminService {
  constructor(
    @Inject('AUTH_CONTAINER') private container: AwilixContainer<AuthCradle>,
  ) {}

  /**
   * Authenticate admin and create a session
   */
  async login(
    email: string,
    password: string,
  ): Promise<{ admin: InternalAdmin; token: string }> {
    return this.container.cradle.adminManager.login(email, password);
  }

  /**
   * Validate an admin session token
   */
  async validateToken(token: string): Promise<{ admin: InternalAdmin }> {
    return this.container.cradle.adminManager.validateToken(token);
  }

  /**
   * Logout an admin by destroying their session
   */
  async logout(token: string): Promise<void> {
    return this.container.cradle.adminManager.logout(token);
  }

  /**
   * Get an admin by ID
   */
  async getAdmin(adminId: string): Promise<InternalAdmin> {
    const admin =
      await this.container.cradle.adminManager.findAdminById(adminId);
    if (!admin) {
      throw new Error(`Admin not found with ID: ${adminId}`);
    }
    return admin;
  }

  /**
   * List all admins with pagination
   */
  async listAdmins(
    page = 1,
    limit = 10,
  ): Promise<{
    admins: InternalAdmin[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.container.cradle.adminManager.listAdmins(page, limit);
  }

  /**
   * Create a new admin
   */
  async createAdmin(
    adminData: Partial<InternalAdmin>,
    password: string,
    creatorId?: string,
  ): Promise<InternalAdmin> {
    return this.container.cradle.adminManager.createAdmin(
      adminData,
      password,
      creatorId,
    );
  }

  /**
   * Update an existing admin
   */
  async updateAdmin(
    adminId: string,
    adminData: Partial<InternalAdmin>,
    updaterId: string,
  ): Promise<InternalAdmin> {
    return this.container.cradle.adminManager.updateAdmin(
      adminId,
      adminData,
      updaterId,
    );
  }

  /**
   * Delete an admin
   */
  async deleteAdmin(adminId: string, deleterId: string): Promise<void> {
    return this.container.cradle.adminManager.deleteAdmin(adminId, deleterId);
  }

  /**
   * Get audit logs with pagination
   */
  async getAuditLogs(
    adminId?: string,
    page = 1,
    limit = 10,
  ): Promise<{
    logs: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.container.cradle.adminManager.getAuditLogs(
      adminId,
      page,
      limit,
    );
  }

  /**
   * Grant a permission to an admin
   */
  async grantPermission(
    adminId: string,
    permission: string,
    granterId: string,
  ): Promise<void> {
    return this.container.cradle.adminManager.grantPermission(
      adminId,
      permission,
      granterId,
    );
  }

  /**
   * Revoke a permission from an admin
   */
  async revokePermission(
    adminId: string,
    permission: string,
    revokerId: string,
  ): Promise<void> {
    return this.container.cradle.adminManager.revokePermission(
      adminId,
      permission,
      revokerId,
    );
  }

  /**
   * Get the current auth configuration
   */
  async getAuthConfig() {
    return this.container.cradle.adminManager.getAuthConfig();
  }

  /**
   * Update the auth configuration
   */
  async updateAuthConfig(config: any, adminId: string) {
    return this.container.cradle.adminManager.updateAuthConfig(config, adminId);
  }

  /**
   * Create a new API key for an admin
   */
  async createApiKey(
    adminId: string,
    options: {
      name: string;
      scopes?: string[];
      expires_at?: Date | null;
    },
  ): Promise<{ apiKey: AdminApiKey; fullKey: string }> {
    return this.container.cradle.adminManager.createApiKey(adminId, options);
  }

  /**
   * List all API keys for an admin
   */
  async listApiKeys(adminId: string): Promise<AdminApiKey[]> {
    return this.container.cradle.adminManager.listApiKeys(adminId);
  }

  /**
   * Get an API key by ID
   */
  async getApiKey(keyId: string, adminId: string): Promise<AdminApiKey> {
    return this.container.cradle.adminManager.getApiKey(keyId, adminId);
  }

  /**
   * Update an API key
   */
  async updateApiKey(
    keyId: string,
    adminId: string,
    updates: {
      name?: string;
      scopes?: string[];
      expires_at?: Date | null;
    },
  ): Promise<AdminApiKey> {
    return this.container.cradle.adminManager.updateApiKey(
      keyId,
      adminId,
      updates,
    );
  }

  /**
   * Delete an API key
   */
  async deleteApiKey(keyId: string, adminId: string): Promise<boolean> {
    return this.container.cradle.adminManager.deleteApiKey(keyId, adminId);
  }

  /**
   * Validate an API key and get the associated admin
   */
  async validateApiKey(
    apiKey: string,
  ): Promise<{ admin: InternalAdmin; scopes: string[] }> {
    return this.container.cradle.adminManager.validateApiKey(apiKey);
  }
}
