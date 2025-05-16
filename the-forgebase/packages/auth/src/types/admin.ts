/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Base Admin user interface
 */
export interface InternalAdmin {
  id: string;
  email: string;
  name?: string;
  password_hash: string;
  role: string;
  permissions?: string[];
  is_super_admin: boolean;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Admin session interface
 */
export interface AdminSession {
  id: string;
  admin_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Admin audit log entry interface
 */
export interface AdminAuditLog {
  id: string;
  admin_id: string;
  action: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Admin API key interface
 */
export interface AdminApiKey {
  id: string;
  admin_id: string;
  key_prefix: string;
  key_hash: string;
  name: string;
  scopes?: string[];
  expires_at?: Date | null; // null means non-expiring key
  last_used_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Admin API key creation options
 */
export interface AdminApiKeyCreateOptions {
  name: string;
  admin_id: string;
  scopes?: string[];
  expires_at?: Date | null; // null means non-expiring key
}

/**
 * Admin service interface for admin management operations
 */
export interface AdminService {
  findAdminByEmail(email: string): Promise<InternalAdmin | null>;
  findAdminById(id: string): Promise<InternalAdmin | null>;
  createAdmin(
    admin: Partial<InternalAdmin>,
    password: string
  ): Promise<InternalAdmin>;
  updateAdmin(
    id: string,
    admin: Partial<InternalAdmin>
  ): Promise<InternalAdmin>;
  deleteAdmin(id: string): Promise<void>;
  validatePassword(admin: InternalAdmin, password: string): Promise<boolean>;
  listAdmins(
    page?: number,
    limit?: number
  ): Promise<{
    admins: InternalAdmin[];
    total: number;
    page: number;
    limit: number;
  }>;
  hasPermission(adminId: string, permission: string): Promise<boolean>;
  grantPermission(adminId: string, permission: string): Promise<void>;
  revokePermission(adminId: string, permission: string): Promise<void>;
}

/**
 * Admin session manager interface
 */
export interface AdminSessionManager {
  createSession(admin: InternalAdmin): Promise<string>;
  verifySession(token: string): Promise<{ admin: InternalAdmin }>;
  destroySession(token: string): Promise<void>;
}

/**
 * Admin authentication provider interface
 */
export interface AdminAuthProvider {
  authenticate(credentials: {
    email: string;
    password: string;
  }): Promise<InternalAdmin | null>;
}

/**
 * Context data for admin audit logs
 */
export interface AdminAuditContext {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Class for admin-specific errors
 */
export class AdminNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Admin not found: ${identifier}`);
  }
}

export class AdminUnauthorizedError extends Error {
  constructor(identifier: string, action: string) {
    super(`Admin ${identifier} is not authorized to perform ${action}`);
  }
}

export class AdminFeatureDisabledError extends Error {
  constructor() {
    super(
      'Admin feature is disabled. Enable it in the configuration to use admin functionality.'
    );
  }
}

export class InitialAdminRequiredError extends Error {
  constructor() {
    super('Admin feature is enabled but no initial admin has been created.');
  }
}
