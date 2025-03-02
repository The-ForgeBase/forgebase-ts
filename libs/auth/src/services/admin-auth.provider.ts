import { AdminAuthProvider, InternalAdmin } from '../types/admin';
import { KnexAdminService } from './admin.knex.service';

/**
 * Authentication provider for admin login
 */
export class BasicAdminAuthProvider implements AdminAuthProvider {
  constructor(private adminService: KnexAdminService) {}

  /**
   * Authenticate an admin using email and password
   * @param credentials Admin credentials (email and password)
   * @returns Authenticated admin or null if authentication failed
   */
  async authenticate(credentials: {
    email: string;
    password: string;
  }): Promise<InternalAdmin | null> {
    const { email, password } = credentials;

    // Find admin by email
    const admin = await this.adminService.findAdminByEmail(email);
    if (!admin) {
      return null;
    }

    // Validate password
    const isValid = await this.adminService.validatePassword(admin, password);
    if (!isValid) {
      return null;
    }

    return admin;
  }
}
