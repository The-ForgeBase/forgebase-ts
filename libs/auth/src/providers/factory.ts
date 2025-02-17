import { AuthError, AUTH_ERROR_CODES } from '../lib/errors';

export interface AuthProvider {
  type: string;
  authenticate(
    credentials: unknown
  ): Promise<{ id: string; [key: string]: any }>;
  validateConfig(config: unknown): Promise<void>;
}

export abstract class BaseProvider implements AuthProvider {
  abstract type: string;
  protected config: Record<string, any> = {};

  async validateConfig(config: unknown): Promise<void> {
    this.config = config as Record<string, any>;
  }

  abstract authenticate(
    credentials: unknown
  ): Promise<{ id: string; [key: string]: any }>;
}

export class ProviderFactory {
  private static providerBuilders = new Map<string, new () => AuthProvider>();

  static register(type: string, ProviderClass: new () => AuthProvider): void {
    this.providerBuilders.set(type, ProviderClass);
  }

  static async createProvider(
    type: string,
    config: Record<string, any>
  ): Promise<AuthProvider> {
    const ProviderClass = this.providerBuilders.get(type);
    if (!ProviderClass) {
      throw new AuthError(
        AUTH_ERROR_CODES.PROVIDER_NOT_FOUND,
        `No provider registered for type: ${type}`
      );
    }

    const provider = new ProviderClass();
    await provider.validateConfig(config);
    return provider;
  }
}
