import { AuthService } from './service';
import { AuthConfig } from '../config/configuration';
import { AuthError, AUTH_ERROR_CODES } from './errors';

export interface TenantConfig extends AuthConfig {
  tenantId: string;
  name: string;
  domains?: string[];
  customConfig?: Record<string, any>;
}

export class TenantManager {
  private tenants = new Map<string, AuthService>();
  private domainMap = new Map<string, string>();

  async createTenant(config: TenantConfig): Promise<void> {
    if (this.tenants.has(config.tenantId)) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_CONFIG,
        `Tenant ${config.tenantId} already exists`
      );
    }

    const authService = new AuthService(config);
    this.tenants.set(config.tenantId, authService);

    // Map domains to tenant if provided
    if (config.domains) {
      for (const domain of config.domains) {
        this.domainMap.set(domain.toLowerCase(), config.tenantId);
      }
    }
  }

  async updateTenant(
    tenantId: string,
    config: Partial<TenantConfig>
  ): Promise<void> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_CONFIG,
        `Tenant ${tenantId} not found`
      );
    }

    // Update domain mappings if domains are being updated
    if (config.domains) {
      // Remove old domain mappings for this tenant
      for (const [domain, tid] of this.domainMap.entries()) {
        if (tid === tenantId) {
          this.domainMap.delete(domain);
        }
      }
      // Add new domain mappings
      for (const domain of config.domains) {
        this.domainMap.set(domain.toLowerCase(), tenantId);
      }
    }

    await tenant.updateConfig(config);
  }

  async deleteTenant(tenantId: string): Promise<void> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return;

    // Remove domain mappings
    for (const [domain, tid] of this.domainMap.entries()) {
      if (tid === tenantId) {
        this.domainMap.delete(domain);
      }
    }

    this.tenants.delete(tenantId);
  }

  getTenant(tenantId: string): AuthService | undefined {
    return this.tenants.get(tenantId);
  }

  getTenantByDomain(domain: string): AuthService | undefined {
    const tenantId = this.domainMap.get(domain.toLowerCase());
    if (tenantId) {
      return this.tenants.get(tenantId);
    }
  }

  async validateTenantAccess(
    tenantId: string,
    userId: string
  ): Promise<boolean> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return false;

    // Here you can implement custom tenant access validation logic
    // For example, checking if the user has permissions in this tenant
    return true;
  }
}
