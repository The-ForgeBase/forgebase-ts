import { AuthError, AUTH_ERROR_CODES } from '../lib/errors';
import { authEvents } from '../lib/events';
import { AuthProvider } from './factory';

export class AuthenticationStrategy {
  constructor(private providers: Map<string, AuthProvider>) {}

  async authenticate(
    type: string,
    credentials: unknown
  ): Promise<{ id: string; [key: string]: any }> {
    const provider = this.providers.get(type);

    if (!provider) {
      throw new AuthError(
        AUTH_ERROR_CODES.PROVIDER_NOT_FOUND,
        `Authentication provider '${type}' not found`,
        400
      );
    }

    try {
      const result = await provider.authenticate(credentials);
      await authEvents.emit('auth:user:authenticated', {
        userId: result.id,
        provider: type,
      });
      return result;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      throw new AuthError(
        AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        'Authentication failed',
        401,
        error as Error
      );
    }
  }

  async validateProviderConfig(type: string, config: unknown): Promise<void> {
    const provider = this.providers.get(type);

    if (!provider) {
      throw new AuthError(
        AUTH_ERROR_CODES.PROVIDER_NOT_FOUND,
        `Provider '${type}' not found`,
        400
      );
    }

    await provider.validateConfig(config);
  }
}
