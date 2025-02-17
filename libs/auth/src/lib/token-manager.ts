import { z } from 'zod';
import { AuthError, AUTH_ERROR_CODES } from '../lib/errors';
import { authEvents, AuthEventMap } from '../lib/events';

export interface TokenOptions {
  type: string;
  value: string;
  expiresAt?: number;
  metadata?: Record<string, any>;
}

declare module '../lib/events' {
  interface AuthEventMap {
    'auth:token:stored': {
      userId: string;
      tokenType: string;
      expiresAt: number;
    };
    'auth:token:removed': { userId: string; tokenType: string };
    'auth:tokens:cleared': { userId: string };
  }
}

export class TokenManager {
  private tokens = new Map<string, Map<string, TokenOptions>>();

  async storeToken(userId: string, token: TokenOptions): Promise<void> {
    if (!this.tokens.has(userId)) {
      this.tokens.set(userId, new Map());
    }

    this.tokens.get(userId)!.set(token.type, token);
    await authEvents.emit('auth:token:stored', {
      userId,
      tokenType: token.type,
      expiresAt: token.expiresAt,
    });
  }

  async getToken(userId: string, type: string): Promise<TokenOptions | null> {
    const userTokens = this.tokens.get(userId);
    if (!userTokens) return null;

    const token = userTokens.get(type);
    if (!token) return null;

    if (token.expiresAt && Date.now() > token.expiresAt) {
      userTokens.delete(type);
      return null;
    }

    return token;
  }

  async removeToken(userId: string, type: string): Promise<void> {
    const userTokens = this.tokens.get(userId);
    if (userTokens?.delete(type)) {
      await authEvents.emit('auth:token:removed', { userId, tokenType: type });
    }
  }

  async clearUserTokens(userId: string): Promise<void> {
    if (this.tokens.delete(userId)) {
      await authEvents.emit('auth:tokens:cleared', { userId });
    }
  }
}
