import { Knex } from 'knex';
import {
  AdminApiKey,
  AdminAuthProvider,
  AdminFeatureDisabledError,
  AdminNotFoundError,
  AdminSessionManager,
  AdminUnauthorizedError,
  InternalAdmin,
  InitialAdminRequiredError,
} from '../types/admin';
import { KnexAdminService } from '../services/admin.knex.service';
import { AdminApiKeyService } from '../services/admin-api-key.service';
import { ConfigStore } from '../types';
import { AuthConfig } from '../types';
import { initializeAdminTables } from '../config/schema';
import { AuthAdminAuditLogsTable } from '../config';

/**
 * Admin audit log interface
 */
interface AuditLogEntry {
  admin_id: string;
  action: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Manager for internal admin functionality
 */
export class InternalAdminManager {
  private adminService: KnexAdminService;
  private apiKeyService: AdminApiKeyService;
  private isEnabled = false;
  private hasInitialAdmin = false;

  constructor(
    private knex: Knex,
    private authProvider: AdminAuthProvider,
    private sessionManager: AdminSessionManager,
    private configStore: ConfigStore
  ) {
    this.adminService = new KnexAdminService(knex);
    this.apiKeyService = new AdminApiKeyService(knex);
  }

  /**
   * Initialize the admin manager
   * This must be called before using any other methods
   */
  async initialize(): Promise<void> {
    const config = await this.configStore.getConfig();

    // Check if admin feature is enabled
    this.isEnabled = config.adminFeature?.enabled || false;

    if (!this.isEnabled) {
      return;
    }

    await initializeAdminTables(this.knex);

    // Create initial admin if not exists
    if (config.adminFeature?.createInitialAdmin) {
      console.log('Initializing admin manager...');
      await this.ensureInitialAdmin(
        config.adminFeature.initialAdminEmail,
        config.adminFeature.initialAdminPassword
      );
    }

    console.log('InternalAdminManager initialized successfully.');
  }

  /**
   * Create initial super admin if no admins exist
   */
  private async ensureInitialAdmin(
    email: string,
    password: string
  ): Promise<void> {
    // Check if any admin exists
    const { total } = await this.adminService.listAdmins(1, 1);
    const config = await this.configStore.getConfig();

    if (total === 0) {
      // Create initial admin with super admin privileges
      const admin = await this.adminService.createAdmin(
        {
          email,
          name: 'Initial Admin',
          role: 'super_admin',
          is_super_admin: true,
          permissions: ['*'],
        },
        password
      );

      this.hasInitialAdmin = true;

      // Create initial API key if configured
      if (config.adminFeature?.createInitialApiKey) {
        try {
          const result = await this.createApiKey(admin.id, {
            name:
              config.adminFeature.initialApiKeyName || 'Initial Admin API Key',
            scopes: config.adminFeature.initialApiKeyScopes || ['*'],
            expires_at: null, // Non-expiring key
          });

          console.log('Created initial admin API key:', {
            id: result.apiKey.id,
            name: result.apiKey.name,
            key_prefix: result.apiKey.key_prefix,
            scopes: result.apiKey.scopes,
          });
          console.log(
            'IMPORTANT: Save this API key, it will only be shown once:',
            result.fullKey
          );
        } catch (error) {
          console.error('Failed to create initial admin API key:', error);
        }
      }
    } else {
      this.hasInitialAdmin = true;
    }
  }

  /**
   * Check if admin feature is enabled
   * @throws AdminFeatureDisabledError if admin feature is disabled
   */
  private checkEnabled(): void {
    if (!this.isEnabled) {
      throw new AdminFeatureDisabledError();
    }

    if (!this.hasInitialAdmin) {
      throw new InitialAdminRequiredError();
    }
  }

  /**
   * Authenticate an admin with email and password
   * @param email Admin email
   * @param password Admin password
   * @returns Admin and session token
   */
  async login(
    email: string,
    password: string
  ): Promise<{ admin: InternalAdmin; token: string }> {
    this.checkEnabled();

    const admin = await this.authProvider.authenticate({ email, password });
    if (!admin) {
      throw new Error('Invalid email or password');
    }

    const token = await this.sessionManager.createSession(admin);

    await this.createAuditLog({
      admin_id: admin.id,
      action: 'LOGIN',
      details: { email },
    });
    delete admin.password_hash;
    return { admin, token };
  }

  /**
   * Verify an admin's session token
   * @param token Session token
   * @returns Admin associated with the token
   */
  async validateToken(token: string): Promise<{ admin: InternalAdmin }> {
    this.checkEnabled();
    return this.sessionManager.verifySession(token);
  }

  /**
   * Logout an admin by destroying their session
   * @param token Session token
   */
  async logout(token: string): Promise<void> {
    this.checkEnabled();
    const { admin } = await this.validateToken(token);

    await this.sessionManager.destroySession(token);

    await this.createAuditLog({
      admin_id: admin.id,
      action: 'LOGOUT',
    });
  }

  /**
   * Find an admin by ID
   * @param adminId Admin ID
   * @returns Admin or null if not found
   */
  async findAdminById(adminId: string): Promise<InternalAdmin | null> {
    this.checkEnabled();
    return this.adminService.findAdminById(adminId);
  }

  /**
   * Find an admin by email
   * @param email Admin email
   * @returns Admin or null if not found
   */
  async findAdminByEmail(email: string): Promise<InternalAdmin | null> {
    this.checkEnabled();
    return this.adminService.findAdminByEmail(email);
  }

  /**
   * Create a new admin
   * @param adminData Admin data
   * @param password Admin password
   * @param creatorId ID of admin creating the new admin
   * @returns Created admin
   */
  async createAdmin(
    adminData: Partial<InternalAdmin>,
    password: string,
    creatorId?: string
  ): Promise<InternalAdmin> {
    this.checkEnabled();

    // If creatorId is provided, verify they have permission
    if (creatorId) {
      const hasPermission = await this.adminService.hasPermission(
        creatorId,
        'create_admin'
      );
      if (!hasPermission) {
        throw new AdminUnauthorizedError(creatorId, 'create_admin');
      }
    }

    const admin = await this.adminService.createAdmin(adminData, password);

    if (creatorId) {
      await this.createAuditLog({
        admin_id: creatorId,
        action: 'ADMIN_CREATED',
        details: { targetAdminId: admin.id, email: admin.email },
      });
    }

    return admin;
  }

  /**
   * Update an admin
   * @param adminId Admin ID to update
   * @param adminData New admin data
   * @param updaterId ID of admin making the update
   * @returns Updated admin
   */
  async updateAdmin(
    adminId: string,
    adminData: Partial<InternalAdmin>,
    updaterId: string
  ): Promise<InternalAdmin> {
    this.checkEnabled();

    // Verify updater has permission
    const hasPermission = await this.adminService.hasPermission(
      updaterId,
      'update_admin'
    );
    if (!hasPermission) {
      throw new AdminUnauthorizedError(updaterId, 'update_admin');
    }

    // Check if updating a super admin
    const targetAdmin = await this.adminService.findAdminById(adminId);
    if (targetAdmin?.is_super_admin) {
      const updaterIsSuperAdmin = await this.isSuperAdmin(updaterId);
      if (!updaterIsSuperAdmin) {
        throw new AdminUnauthorizedError(updaterId, 'update_super_admin');
      }
    }

    const updatedAdmin = await this.adminService.updateAdmin(
      adminId,
      adminData
    );

    await this.createAuditLog({
      admin_id: updaterId,
      action: 'ADMIN_UPDATED',
      details: { targetAdminId: adminId, changes: adminData },
    });

    return updatedAdmin;
  }

  /**
   * Delete an admin
   * @param adminId Admin ID to delete
   * @param deleterId ID of admin performing the delete
   */
  async deleteAdmin(adminId: string, deleterId: string): Promise<void> {
    this.checkEnabled();

    // Verify deleter has permission
    const hasPermission = await this.adminService.hasPermission(
      deleterId,
      'delete_admin'
    );
    if (!hasPermission) {
      throw new AdminUnauthorizedError(deleterId, 'delete_admin');
    }

    // Check if deleting a super admin
    const targetAdmin = await this.adminService.findAdminById(adminId);
    if (!targetAdmin) {
      throw new AdminNotFoundError(adminId);
    }

    if (targetAdmin.is_super_admin) {
      const deleterIsSuperAdmin = await this.isSuperAdmin(deleterId);
      if (!deleterIsSuperAdmin) {
        throw new AdminUnauthorizedError(deleterId, 'delete_super_admin');
      }
    }

    // Don't allow self-deletion
    if (adminId === deleterId) {
      throw new Error('Admin cannot delete their own account');
    }

    await this.adminService.deleteAdmin(adminId);

    await this.createAuditLog({
      admin_id: deleterId,
      action: 'ADMIN_DELETED',
      details: { targetAdminId: adminId },
    });
  }

  /**
   * List all admins with pagination
   * @param page Page number
   * @param limit Items per page
   * @returns Paginated list of admins
   */
  async listAdmins(
    page = 1,
    limit = 10
  ): Promise<{
    admins: InternalAdmin[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.checkEnabled();
    return this.adminService.listAdmins(page, limit);
  }

  /**
   * Grant a permission to an admin
   * @param adminId Admin to grant permission to
   * @param permission Permission to grant
   * @param granterId ID of admin granting the permission
   */
  async grantPermission(
    adminId: string,
    permission: string,
    granterId: string
  ): Promise<void> {
    this.checkEnabled();

    // Verify granter has permission
    const hasPermission = await this.adminService.hasPermission(
      granterId,
      'manage_permissions'
    );
    if (!hasPermission) {
      throw new AdminUnauthorizedError(granterId, 'manage_permissions');
    }

    await this.adminService.grantPermission(adminId, permission);

    await this.createAuditLog({
      admin_id: granterId,
      action: 'PERMISSION_GRANTED',
      details: { targetAdminId: adminId, permission },
    });
  }

  /**
   * Revoke a permission from an admin
   * @param adminId Admin to revoke permission from
   * @param permission Permission to revoke
   * @param revokerId ID of admin revoking the permission
   */
  async revokePermission(
    adminId: string,
    permission: string,
    revokerId: string
  ): Promise<void> {
    this.checkEnabled();

    // Verify revoker has permission
    const hasPermission = await this.adminService.hasPermission(
      revokerId,
      'manage_permissions'
    );
    if (!hasPermission) {
      throw new AdminUnauthorizedError(revokerId, 'manage_permissions');
    }

    await this.adminService.revokePermission(adminId, permission);

    await this.createAuditLog({
      admin_id: revokerId,
      action: 'PERMISSION_REVOKED',
      details: { targetAdminId: adminId, permission },
    });
  }

  /**
   * Check if an admin has super admin privileges
   * @param adminId Admin ID to check
   * @returns True if the admin is a super admin
   */
  async isSuperAdmin(adminId: string): Promise<boolean> {
    this.checkEnabled();

    const admin = await this.adminService.findAdminById(adminId);
    if (!admin) {
      return false;
    }

    return admin.is_super_admin === true;
  }

  /**
   * Update the auth configuration
   * @param updates Config updates
   * @param adminId ID of admin making the update
   * @returns Updated config
   */
  async updateAuthConfig(
    updates: Partial<AuthConfig>,
    adminId: string
  ): Promise<AuthConfig> {
    this.checkEnabled();

    // Verify admin has permission to update config
    const hasPermission = await this.adminService.hasPermission(
      adminId,
      'configure_auth'
    );
    if (!hasPermission) {
      throw new AdminUnauthorizedError(adminId, 'configure_auth');
    }

    const updatedConfig = await this.configStore.updateConfig(updates);

    // Update internal state if admin feature setting changed
    if (updates.adminFeature?.enabled !== undefined) {
      this.isEnabled = updates.adminFeature.enabled;
    }

    await this.createAuditLog({
      admin_id: adminId,
      action: 'CONFIG_UPDATED',
      details: { changes: updates },
    });

    return updatedConfig;
  }

  /**
   * Get the current auth configuration
   * @returns Current auth config
   */
  async getAuthConfig(): Promise<AuthConfig> {
    this.checkEnabled();
    return this.configStore.getConfig();
  }

  /**
   * Create an admin audit log entry
   * @param logEntry Log entry data
   */
  private async createAuditLog(logEntry: AuditLogEntry): Promise<void> {
    await this.knex(AuthAdminAuditLogsTable).insert({
      admin_id: logEntry.admin_id,
      action: logEntry.action,
      details: logEntry.details ? JSON.stringify(logEntry.details) : null,
      ip_address: logEntry.ip_address,
      user_agent: logEntry.user_agent,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });
  }

  /**
   * Get audit logs with pagination
   * @param adminId Optional admin ID to filter logs by
   * @param page Page number
   * @param limit Items per page
   * @returns Paginated audit logs
   */
  async getAuditLogs(
    adminId?: string,
    page = 1,
    limit = 10
  ): Promise<{
    logs: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.checkEnabled();

    const offset = (page - 1) * limit;

    let query = this.knex(AuthAdminAuditLogsTable)
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    if (adminId) {
      query = query.where({ admin_id: adminId });
    }

    const logs = await query;

    let countQuery = this.knex(AuthAdminAuditLogsTable).count('id as count');

    if (adminId) {
      countQuery = countQuery.where({ admin_id: adminId });
    }

    const [{ count }] = await countQuery;

    return {
      logs,
      total: Number(count),
      page,
      limit,
    };
  }

  /**
   * Create a new API key for an admin
   * @param adminId The admin ID
   * @param options API key creation options
   * @returns The created API key and the full key (only returned once)
   */
  async createApiKey(
    adminId: string,
    options: {
      name: string;
      scopes?: string[];
      expires_at?: Date | null; // null means non-expiring key
    }
  ): Promise<{ apiKey: AdminApiKey; fullKey: string }> {
    this.checkEnabled();

    // Verify admin exists
    const admin = await this.adminService.findAdminById(adminId);
    if (!admin) {
      throw new AdminNotFoundError(adminId);
    }

    // Create the API key
    const result = await this.apiKeyService.createApiKey({
      admin_id: adminId,
      name: options.name,
      scopes: options.scopes,
      expires_at: options.expires_at,
    });

    // Log the API key creation
    await this.createAuditLog({
      admin_id: adminId,
      action: 'API_KEY_CREATED',
      details: {
        key_id: result.apiKey.id,
        name: options.name,
        scopes: options.scopes,
        expires_at: options.expires_at,
      },
    });

    return result;
  }

  /**
   * List all API keys for an admin
   * @param adminId The admin ID
   * @returns Array of API keys
   */
  async listApiKeys(adminId: string): Promise<AdminApiKey[]> {
    this.checkEnabled();

    // Verify admin exists
    const admin = await this.adminService.findAdminById(adminId);
    if (!admin) {
      throw new AdminNotFoundError(adminId);
    }

    return this.apiKeyService.listApiKeys(adminId);
  }

  /**
   * Get an API key by ID
   * @param keyId The API key ID
   * @param adminId The admin ID (for permission checking)
   * @returns The API key if found and owned by the admin
   */
  async getApiKey(keyId: string, adminId: string): Promise<AdminApiKey> {
    this.checkEnabled();

    const apiKey = await this.apiKeyService.getApiKeyById(keyId);
    if (!apiKey) {
      throw new Error(`API key not found: ${keyId}`);
    }

    // Check if the API key belongs to the admin
    if (apiKey.admin_id !== adminId) {
      throw new AdminUnauthorizedError(adminId, 'view_api_key');
    }

    return apiKey;
  }

  /**
   * Update an API key
   * @param keyId The API key ID
   * @param adminId The admin ID (for permission checking)
   * @param updates The updates to apply
   * @returns The updated API key
   */
  async updateApiKey(
    keyId: string,
    adminId: string,
    updates: {
      name?: string;
      scopes?: string[];
      expires_at?: Date | null;
    }
  ): Promise<AdminApiKey> {
    this.checkEnabled();

    // Verify the API key exists and belongs to the admin
    await this.getApiKey(keyId, adminId);

    // Update the API key
    const updatedKey = await this.apiKeyService.updateApiKey(keyId, updates);
    if (!updatedKey) {
      throw new Error(`Failed to update API key: ${keyId}`);
    }

    // Log the API key update
    await this.createAuditLog({
      admin_id: adminId,
      action: 'API_KEY_UPDATED',
      details: {
        key_id: keyId,
        updates,
      },
    });

    return updatedKey;
  }

  /**
   * Delete an API key
   * @param keyId The API key ID
   * @param adminId The admin ID (for permission checking)
   * @returns True if the key was deleted
   */
  async deleteApiKey(keyId: string, adminId: string): Promise<boolean> {
    this.checkEnabled();

    // Verify the API key exists and belongs to the admin
    const apiKey = await this.getApiKey(keyId, adminId);

    // Delete the API key
    const deleted = await this.apiKeyService.deleteApiKey(keyId);

    // Log the API key deletion
    if (deleted) {
      await this.createAuditLog({
        admin_id: adminId,
        action: 'API_KEY_DELETED',
        details: {
          key_id: keyId,
          name: apiKey.name,
        },
      });
    }

    return deleted;
  }

  /**
   * Validate an API key and get the associated admin
   * @param apiKey The API key to validate
   * @returns The admin associated with the API key if valid
   */
  async validateApiKey(
    apiKey: string
  ): Promise<{ admin: InternalAdmin; scopes: string[] }> {
    this.checkEnabled();

    // Validate the API key
    const key = await this.apiKeyService.validateApiKey(apiKey);
    if (!key) {
      throw new Error('Invalid API key');
    }

    // Get the admin associated with the API key
    const admin = await this.adminService.findAdminById(key.admin_id);
    if (!admin) {
      throw new AdminNotFoundError(key.admin_id);
    }

    // Return the admin and the API key scopes
    return {
      admin,
      scopes: key.scopes || [],
    };
  }

  /**
   * Check if an API key has a specific scope
   * @param apiKey The API key
   * @param scope The scope to check
   * @returns True if the API key has the scope
   */
  hasApiKeyScope(apiKey: AdminApiKey, scope: string): boolean {
    return this.apiKeyService.hasScope(apiKey, scope);
  }
}
