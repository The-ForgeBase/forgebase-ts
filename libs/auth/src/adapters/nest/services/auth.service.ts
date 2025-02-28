import {
  AuthRequiredType,
  AuthToken,
  DynamicAuthManager,
  User,
} from '@forgebase-ts/auth';
import { Injectable, Inject } from '@nestjs/common';

@Injectable()
export class AuthService<TUser extends User> {
  constructor(
    @Inject('AUTH_MANAGER') private authManager: DynamicAuthManager<TUser>
  ) {}

  async register(
    provider: string,
    credentials: Partial<TUser>,
    password: string
  ): Promise<{
    user?: TUser;
    token: AuthToken | string | AuthRequiredType;
    url?: URL;
  }> {
    try {
      return this.authManager.register(provider, credentials, password);
    } catch (error) {
      throw error;
    }
  }

  async login(
    provider: string,
    credentials: Record<string, string>
  ): Promise<{
    user?: TUser;
    token: AuthToken | string | AuthRequiredType;
    url?: URL;
  }> {
    return this.authManager.login(provider, credentials);
  }

  async passwordlessLogin(code: string): Promise<{
    user: TUser;
    token: AuthToken | string | AuthRequiredType;
  }> {
    const user = await this.authManager.validateToken(code, 'passwordless');

    if (!user) {
      throw new Error('Invalid code');
    }

    return user as {
      user: TUser;
      token: AuthToken | string | AuthRequiredType;
    };
  }

  async oauthCallback(
    provider: string,
    code: string,
    state: string
  ): Promise<{
    user?: TUser;
    token: AuthToken | string | AuthRequiredType;
  }> {
    return this.authManager.oauthCallback(provider, { code, state });
  }

  async logout(token: string): Promise<void> {
    return this.authManager.logout(token);
  }

  async refreshToken(refreshToken: string) {
    return this.authManager.refreshToken(refreshToken);
  }

  async verifyEmail(userId: string, code: string) {
    return this.authManager.verifyEmail(userId, code);
  }

  async verifySms(userId: string, code: string) {
    return this.authManager.verifySms(userId, code);
  }

  async verifyMfa(userId: string, code: string) {
    return this.authManager.verifyMfa(userId, code);
  }

  async enableMfa(userId: string, code?: string) {
    return this.authManager.enableMfa(userId, code);
  }

  async disableMfa(userId: string, code: string) {
    return this.authManager.disableMfa(userId, code);
  }

  async validateToken(
    token: string,
    provider: string
  ): Promise<{ user: TUser; token?: string | AuthToken }> {
    return this.authManager.validateToken(token, provider);
  }

  getProviderConfig(provider: string) {
    return this.authManager.getProviderConfig(provider);
  }
}
