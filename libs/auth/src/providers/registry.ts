import { z } from 'zod';
import type { AuthConfig } from '../config/configuration';
import { AuthProvider, BaseProvider } from './factory';
import { AuthError, AUTH_ERROR_CODES } from '../lib/errors';

export class ProviderRegistry {
  private instances = new Map<string, AuthProvider>();
  private config: AuthConfig['providers'] = {};

  registerProvider(type: string, ProviderClass: new () => AuthProvider): void {
    const provider = new ProviderClass();
    this.instances.set(type, provider);
  }

  async configureProvider(
    type: string,
    config: Record<string, any>
  ): Promise<void> {
    const provider = this.instances.get(type);
    if (!provider) {
      throw new AuthError(
        AUTH_ERROR_CODES.PROVIDER_NOT_FOUND,
        `Provider '${type}' not found`
      );
    }

    try {
      await provider.validateConfig(config);
      this.config[type] = { type, enabled: true, config };
    } catch (error) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_CONFIG,
        `Failed to configure provider '${type}': ${error.message}`,
        400,
        error as Error
      );
    }
  }

  getProvider(type: string): AuthProvider | undefined {
    return this.instances.get(type);
  }

  getEnabledProviders(): AuthProvider[] {
    return Array.from(this.instances.entries())
      .filter(([type]) => this.config[type]?.enabled)
      .map(([, provider]) => provider);
  }

  async removeProvider(type: string): Promise<void> {
    this.instances.delete(type);
    delete this.config[type];
  }
}

export const providerRegistry = new ProviderRegistry();
