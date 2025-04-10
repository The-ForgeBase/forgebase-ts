import { Knex } from 'knex';
import {
  AdminNotFoundError,
  AdminService,
  InternalAdmin,
} from '../types/admin';
import { hashPassword, verifyPasswordHash } from '../lib/password';
import { AuthAdminsTable } from '../config';

/**
 * Knex-based implementation of AdminService
 */
export class KnexAdminService implements AdminService {
  private readonly tableName = AuthAdminsTable;

  constructor(private knex: Knex) {}

  /**
   * Find an admin by email
   * @param email Admin email to search for
   * @returns Admin or null if not found
   */
  async findAdminByEmail(email: string): Promise<InternalAdmin | null> {
    const admin = await this.knex(this.tableName).where({ email }).first();

    return admin || null;
  }

  /**
   * Find an admin by ID
   * @param id Admin ID to search for
   * @returns Admin or null if not found
   */
  async findAdminById(id: string): Promise<InternalAdmin | null> {
    const admin = await this.knex(this.tableName).where({ id }).first();
    // console.log('findAdminById', id, admin);
    return admin || null;
  }

  /**
   * Create a new admin
   * @param admin Admin details
   * @param password Plain text password
   * @returns Created admin
   */
  async createAdmin(
    admin: Partial<InternalAdmin>,
    password: string
  ): Promise<InternalAdmin> {
    // Check if email already exists
    const existingAdmin = await this.findAdminByEmail(admin.email);
    if (existingAdmin) {
      throw new Error(`Admin with email ${admin.email} already exists`);
    }

    // Hash the password
    const password_hash = await hashPassword(password);

    // Insert the new admin
    const [newAdmin] = await this.knex(this.tableName)
      .insert({
        ...admin,
        password_hash,
        created_at: this.knex.fn.now(),
        updated_at: this.knex.fn.now(),
      })
      .returning('*');

    return newAdmin;
  }

  /**
   * Update an admin
   * @param id Admin ID
   * @param admin Admin details to update
   * @returns Updated admin
   */
  async updateAdmin(
    id: string,
    admin: Partial<InternalAdmin>
  ): Promise<InternalAdmin> {
    // Check if admin exists
    const existingAdmin = await this.findAdminById(id);
    if (!existingAdmin) {
      throw new AdminNotFoundError(id);
    }

    // Don't allow updating id field
    const adminToUpdate = { ...admin };
    delete adminToUpdate.id;

    // Password should be handled separately with proper hashing
    delete adminToUpdate.password_hash;

    // Update the admin
    const [updatedAdmin] = await this.knex(this.tableName)
      .where({ id })
      .update({
        ...adminToUpdate,
        updated_at: this.knex.fn.now(),
      })
      .returning('*');

    return updatedAdmin;
  }

  /**
   * Update an admin's password
   * @param id Admin ID
   * @param password New plain text password
   */
  async updatePassword(id: string, password: string): Promise<void> {
    // Check if admin exists
    const existingAdmin = await this.findAdminById(id);
    if (!existingAdmin) {
      throw new AdminNotFoundError(id);
    }

    // Hash the new password
    const password_hash = await hashPassword(password);

    // Update the password
    await this.knex(this.tableName).where({ id }).update({
      password_hash,
      updated_at: this.knex.fn.now(),
    });
  }

  /**
   * Delete an admin
   * @param id Admin ID
   */
  async deleteAdmin(id: string): Promise<void> {
    // Check if admin exists
    const existingAdmin = await this.findAdminById(id);
    if (!existingAdmin) {
      throw new AdminNotFoundError(id);
    }

    // Delete the admin
    await this.knex(this.tableName).where({ id }).delete();
  }

  /**
   * Validate a password against an admin's stored hash
   * @param admin Admin object
   * @param password Plain text password to validate
   * @returns True if password is valid
   */
  async validatePassword(
    admin: InternalAdmin,
    password: string
  ): Promise<boolean> {
    return verifyPasswordHash(admin.password_hash, password);
  }

  /**
   * List admins with pagination
   * @param page Page number (1-based)
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
    const offset = (page - 1) * limit;

    const admins = await this.knex(this.tableName)
      .select('*')
      .limit(limit)
      .offset(offset)
      .orderBy('created_at', 'desc');

    const [{ count }] = await this.knex(this.tableName).count('id as count');

    return {
      admins,
      total: Number(count),
      page,
      limit,
    };
  }

  /**
   * Check if an admin has a specific permission
   * @param adminId Admin ID
   * @param permission Permission to check
   * @returns True if admin has permission
   */
  async hasPermission(adminId: string, permission: string): Promise<boolean> {
    const admin = await this.findAdminById(adminId);
    if (!admin) {
      return false;
    }

    // Super admins have all permissions
    if (admin.is_super_admin) {
      return true;
    }

    // Check specific permissions
    if (
      Array.isArray(admin.permissions) &&
      admin.permissions.includes(permission)
    ) {
      return true;
    }

    // Handle role-based permissions here if needed
    // For example, if 'admin' role has certain default permissions

    return false;
  }

  /**
   * Grant a permission to an admin
   * @param adminId Admin ID
   * @param permission Permission to grant
   */
  async grantPermission(adminId: string, permission: string): Promise<void> {
    const admin = await this.findAdminById(adminId);
    if (!admin) {
      throw new AdminNotFoundError(adminId);
    }

    const permissions = admin.permissions || [];

    if (!permissions.includes(permission)) {
      permissions.push(permission);

      await this.knex(this.tableName).where({ id: adminId }).update({
        permissions,
        updated_at: this.knex.fn.now(),
      });
    }
  }

  /**
   * Revoke a permission from an admin
   * @param adminId Admin ID
   * @param permission Permission to revoke
   */
  async revokePermission(adminId: string, permission: string): Promise<void> {
    const admin = await this.findAdminById(adminId);
    if (!admin) {
      throw new AdminNotFoundError(adminId);
    }

    if (admin.permissions) {
      const permissions = admin.permissions.filter((p) => p !== permission);

      await this.knex(this.tableName).where({ id: adminId }).update({
        permissions,
        updated_at: this.knex.fn.now(),
      });
    }
  }

  /**
   * Update admin last login timestamp
   * @param id Admin ID
   */
  async updateLastLogin(id: string): Promise<void> {
    // console.log('Updating last login for admin:', id);
    await this.knex(this.tableName).where({ id }).update({
      last_login_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });

    // console.log('Last login updated successfully for admin 2:', id);
  }
}
