import { Knex } from 'knex';
import {
  AdminAuthProvider,
  AdminFeatureDisabledError,
  AdminNotFoundError,
  AdminSessionManager,
  AdminUnauthorizedError,
  InternalAdmin,
  InitialAdminRequiredError,
} from '../types/admin';
import { KnexAdminService } from '../services/admin.knex.service';
import { ConfigStore } from '../types';
import { AuthConfig } from '../types';
import { initializeAdminTables } from '../config/schema';

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
  private isEnabled = false;
  private hasInitialAdmin = false;

  constructor(
    private knex: Knex,
    private authProvider: AdminAuthProvider,
    private sessionManager: AdminSessionManager,
    private configStore: ConfigStore
  ) {
    this.adminService = new KnexAdminService(knex);
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
    const { admins, total } = await this.adminService.listAdmins(1, 1);

    if (total === 0) {
      // Create initial admin with super admin privileges
      await this.adminService.createAdmin(
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
    await this.knex('internal_admin_audit_logs').insert({
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

    let query = this.knex('internal_admin_audit_logs')
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    if (adminId) {
      query = query.where({ admin_id: adminId });
    }

    const logs = await query;

    let countQuery = this.knex('internal_admin_audit_logs').count(
      'id as count'
    );

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
}
