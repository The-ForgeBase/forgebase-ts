/* eslint-disable @typescript-eslint/no-explicit-any */
import { hashPassword } from './lib/password';
import { sanitizeUser } from './lib/sanitize';
import { BaseOAuthProvider } from './providers';
import {
  AuthConfig,
  AuthInternalConfig,
  AuthProvider,
  AuthRequiredType,
  AuthToken,
  ConfigStore,
  InvalidCodeError,
  InvalidMfaCodeError,
  InvalidProvider,
  MfaAlreadyEnabledError,
  MfaNotEnabledError,
  MfaRecoveryCodeInvalid,
  MfaService,
  OAuthProviderNotExist,
  ProviderDoesNotSupportReg,
  ProviderNotEnabled,
  RateLimiter,
  RateLimitExceededError,
  SessionManager,
  User,
  UserNotFoundError,
  UserUnAuthorizedError,
  VerificationRequiredError,
  EmailVerificationService,
  SmsVerificationService,
} from './types';
import { KnexUserService } from './userService';
import crypto from 'crypto';
import { PluginRegistry } from './plugins/registry';
import { AuthPlugin } from './plugins/types';

export class DynamicAuthManager<TUser extends User> {
  private config: AuthConfig;
  private mfa?: MfaService;
  private rateLimiter?: RateLimiter;
  private pluginRegistry: PluginRegistry<TUser>;

  constructor(
    private configStore: ConfigStore,
    private providers: Record<string, AuthProvider<TUser>>,
    private sessionManager: SessionManager,
    private userService: KnexUserService<TUser>,
    private refreshInterval = 5000,
    private enableConfigIntervalCheck = false,
    private internalConfig: AuthInternalConfig<TUser>,
    private emailVerificationService?: EmailVerificationService<TUser>,
    private smsVerificationService?: SmsVerificationService<TUser>,
    plugins: AuthPlugin<TUser>[] = []
  ) {
    this.watchConfig();

    // Then initialize plugins (needs to be done asynchronously after construction)
    this.initializePlugins(plugins).catch((err) => {
      console.error('Error initializing plugins:', err);
    });
  }

  getUserService() {
    return this.userService;
  }

  private async watchConfig() {
    this.config = await this.configStore.getConfig();
    if (this.enableConfigIntervalCheck) {
      setInterval(async () => {
        const newConfig = await this.configStore.getConfig();
        if (JSON.stringify(newConfig) !== JSON.stringify(this.config)) {
          // this.emit('config-changed', newConfig);
          this.config = newConfig;
        }
      }, this.refreshInterval);
    }
  }

  private async initializePlugins(plugins: AuthPlugin<TUser>[]) {
    this.pluginRegistry = new PluginRegistry<TUser>();
    for (const plugin of plugins) {
      await this.pluginRegistry.register(plugin);
      await plugin.initialize(this);
    }

    // Add providers from plugins to the existing providers
    const pluginProviders = this.pluginRegistry.getAllProviders();
    this.providers = { ...this.providers, ...pluginProviders };
  }

  // Add proper error handling for hooks
  private async executeHooks(event: string, data: any): Promise<void> {
    try {
      const hooks = this.pluginRegistry.getHooks(event);
      for (const hook of hooks) {
        await hook(data);
      }
    } catch (error) {
      // Proper error handling needed - should hooks fail silently or bubble up?
      console.error(`Error executing hook for event ${event}:`, error);
    }
  }

  async registerPlugin(plugin: AuthPlugin<TUser>): Promise<void> {
    await this.pluginRegistry.register(plugin);
    await plugin.initialize(this);

    // Add new providers from this plugin
    const pluginProviders = plugin.getProviders();
    this.providers = { ...this.providers, ...pluginProviders };
  }

  getPlugins(): AuthPlugin<TUser>[] {
    return this.pluginRegistry.getAllPlugins();
  }

  async register(
    provider: string,
    credentials: Partial<TUser>,
    password: string
  ): Promise<{
    user?: TUser;
    token: AuthToken | string | AuthRequiredType;
    url?: URL;
    verificationToken?: string;
  }> {
    if (!this.config.enabledProviders.includes(provider)) {
      throw new ProviderNotEnabled(provider);
    }

    if (this.rateLimiter) {
      const limit = await this.rateLimiter.checkLimit(credentials.email);
      if (!limit.allowed) throw new RateLimitExceededError();
    }

    const authProvider = this.providers[provider];
    if (!authProvider) throw new InvalidProvider();
    if (!authProvider.register) throw new ProviderDoesNotSupportReg(provider);

    if (authProvider instanceof BaseOAuthProvider) {
      const url = await authProvider.getAuthorizationUrl();

      // Execute post-registration hooks
      await this.executeHooks('afterRegister', {
        user: undefined,
        token: provider,
        url,
      });

      return { user: undefined, token: provider, url };
    }

    const user = await authProvider.register(credentials, password);

    if (
      this.config.authPolicy.loginAfterRegistration &&
      !this.config.mfaSettings.required
    ) {
      const token = await this.sessionManager.createSession(user);
      // Execute post-login hooks
      await this.executeHooks('afterLoginFromReg', { user, token });
      // Sanitize user data before returning
      const sanitizedUser = sanitizeUser(user);
      return { user: sanitizedUser, token };
    }

    // Handle email verification if required
    let verificationToken: string | void;
    if (
      this.config.authPolicy.emailVerificationRequired &&
      this.emailVerificationService &&
      user.email
    ) {
      verificationToken =
        await this.emailVerificationService.sendVerificationEmail(
          user.email,
          user
        );
    }

    if (
      this.config.authPolicy.smsVerificationRequired &&
      this.sendVerificationEmail &&
      user.phone
    ) {
      await this.smsVerificationService.sendVerificationSms(user.phone, user);
    }

    // Execute post-registration hooks
    await this.executeHooks('afterRegister', {
      user,
      token: provider,
      verificationToken,
    });

    // Return sanitized user, empty token, and verification token if available
    return {
      user: sanitizeUser(user),
      token: '',
      verificationToken: verificationToken || undefined,
    };
  }

  getEmailVerificationService() {
    return this.emailVerificationService;
  }

  getProviders() {
    return this.providers;
  }

  getProvider(provider: string) {
    return this.providers[provider];
  }

  getProviderConfig(provider: string) {
    return this.providers[provider].getConfig();
  }

  async oauthCallback(
    provider: string,
    { code, state }: { code: string; state: string }
  ): Promise<{
    user?: TUser;
    token: AuthToken | string | AuthRequiredType;
  }> {
    if (!this.config.enabledProviders.includes(provider)) {
      throw new ProviderNotEnabled(provider);
    }

    // if (this.rateLimiter) {
    //   const limit = await this.rateLimiter.checkLimit(credentials.email);
    //   if (!limit.allowed) throw new RateLimitExceededError();
    // }

    const authProvider = this.providers[provider];
    if (!authProvider) throw new InvalidProvider();

    if (!(authProvider instanceof BaseOAuthProvider)) {
      throw new OAuthProviderNotExist(provider);
    }

    const user = await authProvider.authenticate({ code, state });

    if (
      this.config.authPolicy.emailVerificationRequired &&
      this.emailVerificationService &&
      !user.email_verified
    ) {
      throw new VerificationRequiredError('email');
    }

    if (
      this.config.authPolicy.smsVerificationRequired &&
      this.smsVerificationService &&
      !user.phone_verified
    ) {
      throw new VerificationRequiredError('sms');
    }

    const token = await this.sessionManager.createSession(user);
    // Sanitize user data before returning
    return { user: sanitizeUser(user), token };
  }

  async login(
    provider: string,
    credentials: Record<string, string>
  ): Promise<{
    user?: TUser;
    token: AuthToken | string | AuthRequiredType;
    url?: URL;
  }> {
    if (!this.config.enabledProviders.includes(provider)) {
      throw new ProviderNotEnabled(provider);
    }

    await this.executeHooks('beforeLogin', { provider, credentials });

    if (this.rateLimiter) {
      const limit = await this.rateLimiter.checkLimit(credentials.email);
      if (!limit.allowed) throw new RateLimitExceededError();
    }

    const authProvider = this.providers[provider];
    if (!authProvider) throw new InvalidProvider();

    if (authProvider instanceof BaseOAuthProvider) {
      const url = await authProvider.getAuthorizationUrl();

      // Execute post-login hooks
      await this.executeHooks('afterLogin', {
        provider,
        user: undefined,
        token: provider,
      });

      return { user: undefined, token: provider, url };
    }

    const user = await authProvider.authenticate(credentials);

    if (!user) {
      // Execute post-login hooks
      await this.executeHooks('afterLogin', {
        provider,
        user: undefined,
        token: provider,
      });
      return { token: provider };
    }

    if (
      this.config.authPolicy.emailVerificationRequired &&
      this.emailVerificationService &&
      !user.email_verified
    ) {
      throw new VerificationRequiredError('email');
    }

    if (
      this.config.authPolicy.smsVerificationRequired &&
      this.smsVerificationService &&
      !user.phone_verified
    ) {
      throw new VerificationRequiredError('sms');
    }

    const token = await this.sessionManager.createSession(user);
    // Execute post-login hooks
    await this.executeHooks('afterLogin', { provider, user, token });
    // Sanitize user data before returning
    return { user: sanitizeUser(user), token };
  }

  getConfig() {
    return this.config;
  }

  getMfaStatus() {
    if (!this.mfa) {
      return false;
    }
    return true;
  }

  async refreshToken(refreshToken: string) {
    return this.sessionManager.refreshSession(refreshToken);
  }

  async createToken(user: TUser): Promise<AuthToken | string> {
    return this.sessionManager.createSession(user);
  }

  async validateToken(
    token: string,
    provider: string
  ): Promise<{ user: TUser; token?: string | AuthToken }> {
    if (provider === 'passwordless') {
      const authProvider = this.providers[provider];

      if (!authProvider) throw new InvalidProvider();

      const user = await authProvider.validate(token);
      if (!user) {
        throw new UserNotFoundError(user.id);
      }

      const fToken = await this.sessionManager.createSession(user);

      // Sanitize user data before returning
      return { user: sanitizeUser(user), token: fToken };
    }

    const result = await this.sessionManager.verifySession(token);
    // Sanitize user data before returning
    return {
      user: sanitizeUser(result.user) as TUser,
      token: result.token,
    };
  }

  async logout(token: string): Promise<void> {
    await this.sessionManager.destroySession(token);
  }

  async verifyEmail(
    userId: string,
    verificationCode: string
  ): Promise<{ user: TUser; token: AuthToken | string }> {
    // Sanitize inputs
    userId = userId.trim();
    verificationCode = verificationCode.trim();

    const user = await this.userService.findUser(userId);
    if (!user) throw new UserNotFoundError(userId);
    const isValid = await this.emailVerificationService.verifyEmail(
      user.email,
      verificationCode,
      user
    );
    if (!isValid) throw new InvalidCodeError();
    await this.userService.updateUser(user.id, {
      ...user,
      email_verified: true,
    });
    const token = await this.sessionManager.createSession(user);
    // Sanitize user data before returning
    return { user: sanitizeUser(user), token };
  }

  /**
   * Send a verification email to the user
   * @param email The recipient's email address
   * @param verificationUrl Optional custom verification URL base
   * @returns The generated verification token if the service returns one
   */
  async sendVerificationEmail(
    email: string,
    verificationUrl?: string
  ): Promise<string | void> {
    const user = await this.userService.findUser(email);
    if (!user) throw new UserNotFoundError(email);
    return this.emailVerificationService.sendVerificationEmail(
      email,
      user,
      verificationUrl
    );
  }

  /**
   * Send a password reset email to the user
   * @param email The recipient's email address
   * @param resetUrl Optional custom reset URL base
   * @returns The generated reset token if the service returns one
   */
  async sendPasswordResetEmail(
    email: string,
    resetUrl?: string
  ): Promise<string | void> {
    const user = await this.userService.findUser(email);
    if (!user) throw new UserNotFoundError(email);

    // Check if the email verification service has the password reset method
    return this.emailVerificationService.sendPasswordResetEmail(
      email,
      user,
      undefined, // resetUrl parameter (not used when customResetUrlBase is provided)
      resetUrl // customResetUrlBase parameter
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
    const user = await this.userService.findUser(userId);
    if (!user) throw new UserNotFoundError(userId);

    if (
      this.emailVerificationService &&
      'verifyPasswordResetToken' in this.emailVerificationService
    ) {
      return (this.emailVerificationService as any).verifyPasswordResetToken(
        token,
        userId
      );
    }

    throw new Error(
      'Password reset verification not supported by the email verification service'
    );
  }

  async sendVerificationSms(phone: string) {
    const user = await this.userService.findUser(phone);
    if (!user) throw new UserNotFoundError(phone);
    await this.smsVerificationService.sendVerificationSms(phone, user);
  }

  async verifySms(userId: string, verificationCode: string) {
    const user = await this.userService.findUser(userId);
    if (!user) throw new UserNotFoundError(userId);
    const isValid = await this.smsVerificationService.verifySms(
      verificationCode,
      user.phone,
      user
    );
    if (!isValid) throw new InvalidCodeError();
    await this.userService.updateUser(user.id, {
      ...user,
      phone_verified: true,
    });
    const token = await this.sessionManager.createSession(user);
    // Sanitize user data before returning
    return { user: sanitizeUser(user), token };
  }

  /**
   * Reset a user's password
   * @param userId The user ID
   * @param newPassword The new password
   * @param token Optional reset token for token-based password reset
   * @returns True if the password was reset successfully
   */
  async resetPassword(
    userId: string,
    newPassword: string,
    token?: string
  ): Promise<boolean> {
    // If a token is provided, verify it using the email verification service
    if (
      token &&
      this.emailVerificationService &&
      'verifyPasswordResetToken' in this.emailVerificationService
    ) {
      const isValid = await (
        this.emailVerificationService as any
      ).verifyPasswordResetToken(token, userId);
      if (!isValid) throw new InvalidCodeError();
    }

    // Get the user
    const user = await this.userService.findUser(userId);
    if (!user) throw new UserNotFoundError(userId);

    // Hash the new password
    const hash = await hashPassword(newPassword);

    // Update the user's password
    await this.internalConfig
      .knex(this.userService.getTable())
      .where(this.userService.getColumns().id, userId)
      .update({
        [this.userService.getColumns().passwordHash]: hash,
        [this.userService.getColumns().updatedAt]: this.userService
          .getInternalConfig()
          .knex.fn.now(),
      });

    // If a token was used, consume it
    if (
      token &&
      this.emailVerificationService &&
      'consumePasswordResetToken' in this.emailVerificationService
    ) {
      await (this.emailVerificationService as any).consumePasswordResetToken(
        token,
        userId
      );
    }

    return true;
  }

  //TODO: fix mfa required flow properly
  async verifyMfa(userId: string, code: string) {
    // Sanitize inputs
    userId = userId.trim();
    code = code.trim();

    const user = await this.userService.findUser(userId);
    if (!user) throw new UserNotFoundError(userId);

    if (this.rateLimiter) {
      const limit = await this.rateLimiter.checkLimit(user.id);
      if (!limit.allowed) throw new RateLimitExceededError();
    }

    const isValid = this.mfa.verifyCode(user.mfa_secret, code);

    if (!isValid) {
      // Check recovery codes
      const recoveryCodeIndex = user.mfa_recovery_codes.findIndex(
        (rc) => rc === code
      );
      if (recoveryCodeIndex === -1) {
        throw new InvalidMfaCodeError();
      }

      // Remove used recovery code
      const updatedRecoveryCodes = [...user.mfa_recovery_codes];
      updatedRecoveryCodes.splice(recoveryCodeIndex, 1);
      await this.userService.updateUser(user.id, {
        ...user,
        mfa_recovery_codes: updatedRecoveryCodes,
      });
    }

    return this.sessionManager.createSession(user);
  }

  async enableMfa(
    userId: string,
    code?: string
  ): Promise<{ secret?: string; uri?: string } | { recoveryCodes: string[] }> {
    const user = await this.userService.findUser(userId);
    if (!user) throw new UserNotFoundError(userId);

    if (user.mfa_enabled) throw new MfaAlreadyEnabledError(userId);

    // Initial setup
    if (!user.mfa_secret) {
      const { secret, uri } = await this.mfa.generateSecret(user.email);
      await this.userService.updateUser(user.id, {
        ...user,
        mfa_secret: secret,
      });
      return { secret, uri };
    }

    // Final verification
    if (!code || !this.mfa.verifyCode(user.mfa_secret, code)) {
      throw new MfaRecoveryCodeInvalid();
    }

    const recoveryCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(8).toString('hex')
    );

    await this.userService.updateUser(user.id, {
      ...user,
      mfa_enabled: true,
      mfa_recovery_codes: recoveryCodes,
    });

    return { recoveryCodes };
  }

  async disableMfa(userId: string, code: string) {
    // Sanitize inputs
    userId = userId.trim();
    code = code.trim();

    const user = await this.userService.findUser(userId);
    if (!user) throw new UserNotFoundError(userId);
    if (!user.mfa_enabled) throw new MfaNotEnabledError();
    const isValid = this.mfa.verifyCode(user.mfa_secret, code);

    if (!isValid) {
      const validRecovery = user.mfa_recovery_codes.includes(code);
      if (!validRecovery) throw new InvalidMfaCodeError();
    }
    await this.userService.updateUser(user.id, {
      ...user,
      mfa_enabled: false,
      mfa_secret: null,
      mfa_recovery_codes: [],
    });
  }

  async updateConfig(update: Partial<AuthConfig>, adminUser: TUser) {
    if (!this.hasPermission(adminUser.id, 'configure_auth')) {
      throw new UserUnAuthorizedError(adminUser.id, 'configure_auth');
    }
    return this.configStore.updateConfig(update);
  }

  private async hasPermission(userId: string | number, permission: string) {
    //TODO: Implement your permission check logic
    return true;
  }
}

export class AuthConfigAPI {
  constructor(private configStore: ConfigStore) {}

  async getConfig() {
    return this.configStore.getConfig();
  }

  async updateConfig(update: Partial<AuthConfig>, initiator: string) {
    // Add audit logging
    const newConfig = await this.configStore.updateConfig(update);
    await this.auditLog(initiator, 'CONFIG_UPDATED', update);
    return newConfig;
  }

  private async auditLog(userId: string, action: string, details: object) {
    //TODO: Implement audit logging
  }
}
