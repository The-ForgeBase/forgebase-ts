import { AuthClient } from '../client';
import type { BaseUser, AuthClientConfig } from '../types';

export class NextAuthAdapter<T extends BaseUser = BaseUser> {
  private auth: AuthClient<T>;

  constructor(config: AuthClientConfig) {
    this.auth = new AuthClient<T>({
      ...config,
      tokens: {
        includeTokenHeader: false,
      },
      httpClient: {
        credentials: 'include',
      },
    });
  }

  /**
   * Get the current user
   */
  async getCurrentUser() {
    try {
      return await this.auth.getCurrentUser();
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Get the current token from memory storage
   */
  getToken() {
    return this.auth.getAccessToken();
  }

  async register(credentials: Parameters<AuthClient<T>['register']>[0]) {
    return this.auth.register(credentials);
  }

  async login(credentials: Parameters<AuthClient<T>['login']>[0]) {
    return this.auth.login(credentials);
  }

  async logout() {
    return this.auth.logout();
  }

  async verifyEmail(userId: string, code: string) {
    return this.auth.verifyEmail({ userId, code });
  }

  async isAuthenticated(
    options?: Parameters<AuthClient<T>['isAuthenticated']>[0]
  ) {
    return this.auth.isAuthenticated(options);
  }
}
