import { AuthRequiredType, AuthToken, User } from '../../../types';
import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { AwilixContainer } from 'awilix';
import { AuthCradle } from '../../../container';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject('AUTH_CONTAINER') private container: AwilixContainer<AuthCradle>
  ) {
    // Log initialization state for debugging
    this.logger.log('AuthService initialized successfully');
  }

  async register(
    provider: string,
    credentials: Partial<User>,
    password: string
  ): Promise<{
    user?: User;
    token: AuthToken | string | AuthRequiredType;
    url?: URL;
  }> {
    return this.container.cradle.authManager.register(
      provider,
      credentials,
      password
    );
  }

  async login(
    provider: string,
    credentials: Record<string, string>
  ): Promise<{
    user?: User;
    token: AuthToken | string | AuthRequiredType;
    url?: URL;
  }> {
    return this.container.cradle.authManager.login(provider, credentials);
  }

  async passwordlessLogin(code: string): Promise<{
    user: User;
    token: AuthToken | string | AuthRequiredType;
  }> {
    const user = await this.container.cradle.authManager.validateToken(
      code,
      'passwordless'
    );

    if (!user) {
      throw new Error('Invalid code');
    }

    return user as {
      user: User;
      token: AuthToken | string | AuthRequiredType;
    };
  }

  async oauthCallback(
    provider: string,
    code: string,
    state: string
  ): Promise<{
    user?: User;
    token: AuthToken | string | AuthRequiredType;
  }> {
    return this.container.cradle.authManager.oauthCallback(provider, {
      code,
      state,
    });
  }

  async logout(token: string): Promise<void> {
    return this.container.cradle.authManager.logout(token);
  }

  async refreshToken(refreshToken: string) {
    return this.container.cradle.authManager.refreshToken(refreshToken);
  }

  /**
   * Verify an email using a verification code
   * @param userId The user ID
   * @param code The verification code
   * @returns The user and token
   */
  async verifyEmail(userId: string, code: string) {
    return this.container.cradle.authManager.verifyEmail(userId, code);
  }

  /**
   * Send a verification email to a user
   * @param email The email address to send the verification to
   * @param redirectUrl Optional custom verification URL base
   * @returns The verification token if available
   */
  async sendVerificationEmail(
    email: string,
    redirectUrl?: string
  ): Promise<string | void> {
    return this.container.cradle.authManager.sendVerificationEmail(
      email,
      redirectUrl
    );
  }

  /**
   * Send a password reset email to a user
   * @param email The email address to send the reset email to
   * @param redirectUrl Optional custom reset URL base
   * @returns The reset token if available
   */
  async sendPasswordResetEmail(
    email: string,
    redirectUrl?: string
  ): Promise<string | void> {
    return this.container.cradle.authManager.sendPasswordResetEmail(
      email,
      redirectUrl
    );
  }

  /**
   * Verify a password reset token
   * @param userId The user ID
   * @param token The reset token
   * @returns Whether the token is valid
   */
  async verifyPasswordResetToken(
    userId: string,
    token: string
  ): Promise<boolean> {
    return this.container.cradle.authManager.verifyPasswordResetToken(
      userId,
      token
    );
  }

  /**
   * Reset a user's password
   * @param userId The user ID
   * @param newPassword The new password
   * @param token Optional reset token for token-based password reset
   * @returns Whether the password was reset successfully
   */
  async resetPassword(
    userId: string,
    newPassword: string,
    token?: string
  ): Promise<boolean> {
    return this.container.cradle.authManager.resetPassword(
      userId,
      newPassword,
      token
    );
  }

  /**
   * Change a user's password by verifying the old password first
   * @param userId The user ID
   * @param oldPassword The current password
   * @param newPassword The new password
   * @returns Whether the password was changed successfully
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<boolean> {
    return this.container.cradle.authManager.changePassword(
      userId,
      oldPassword,
      newPassword
    );
  }

  async verifySms(userId: string, code: string) {
    return this.container.cradle.authManager.verifySms(userId, code);
  }

  async verifyMfa(userId: string, code: string) {
    return this.container.cradle.authManager.verifyMfa(userId, code);
  }

  async enableMfa(userId: string, code?: string) {
    return this.container.cradle.authManager.enableMfa(userId, code);
  }

  async disableMfa(userId: string, code: string) {
    return this.container.cradle.authManager.disableMfa(userId, code);
  }

  async validateToken(
    token: string,
    provider: string
  ): Promise<{ user: User; token?: string | AuthToken }> {
    return this.container.cradle.authManager.validateToken(token, provider);
  }

  async validateSessionToken(token: string): Promise<User> {
    return this.container.cradle.authManager.validateSessionToken(token);
  }

  async setLabels(userId: string, labels: string[]): Promise<string[]> {
    return this.container.cradle.authManager.setRTP(userId, labels, 'labels');
  }
  async setPermissions(
    userId: string,
    permissions: string[]
  ): Promise<string[]> {
    return this.container.cradle.authManager.setRTP(
      userId,
      permissions,
      'permissions'
    );
  }

  async setTeams(userId: string, teams: string[]): Promise<string[]> {
    return this.container.cradle.authManager.setRTP(userId, teams, 'teams');
  }

  async removeLabels(userId: string, labels: string[]): Promise<string[]> {
    return this.container.cradle.authManager.removeRTP(
      userId,
      labels,
      'labels'
    );
  }

  async removePermissions(
    userId: string,
    permissions: string[]
  ): Promise<string[]> {
    return this.container.cradle.authManager.removeRTP(
      userId,
      permissions,
      'permissions'
    );
  }

  async removeTeams(userId: string, teams: string[]): Promise<string[]> {
    return this.container.cradle.authManager.removeRTP(userId, teams, 'teams');
  }

  async addLabels(userId: string, labels: string[]): Promise<string[]> {
    return this.container.cradle.authManager.addRTP(userId, labels, 'labels');
  }

  async addPermissions(
    userId: string,
    permissions: string[]
  ): Promise<string[]> {
    return this.container.cradle.authManager.addRTP(
      userId,
      permissions,
      'permissions'
    );
  }

  async addTeams(userId: string, teams: string[]): Promise<string[]> {
    return this.container.cradle.authManager.addRTP(userId, teams, 'teams');
  }

  async setRole(userId: string, role: string): Promise<void> {
    return this.container.cradle.authManager.setRole(userId, role);
  }

  getProviderConfig(provider: string) {
    return this.container.cradle.authManager.getProviderConfig(provider);
  }
}
