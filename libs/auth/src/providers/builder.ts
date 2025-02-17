import { AuthProvider, BaseProvider } from './factory';
import { AuthError, AUTH_ERROR_CODES } from '../lib/errors';

export class ProviderBuilder {
  static validateProvider(provider: AuthProvider) {
    if (!provider.type) {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_CONFIG,
        'Provider must have a type property'
      );
    }

    if (typeof provider.authenticate !== 'function') {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_CONFIG,
        'Provider must implement authenticate method'
      );
    }

    if (typeof provider.validateConfig !== 'function') {
      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_CONFIG,
        'Provider must implement validateConfig method'
      );
    }
  }

  static create<T extends AuthProvider>(
    ProviderClass: new () => T
  ): new () => T {
    const tempInstance = new ProviderClass();
    this.validateProvider(tempInstance);
    return ProviderClass;
  }
}

export function createProvider<T extends AuthProvider>(
  ProviderClass: new () => T
): new () => T {
  return ProviderBuilder.create(ProviderClass);
}
