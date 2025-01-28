import { hashPassword } from './lib/password';
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
  MfaRecoveryCodeInvalid,
  MFARequiredError,
  MfaService,
  ProviderDoesNotSupportReg,
  ProviderNotEnabled,
  RateLimiter,
  RateLimitExceededError,
  SessionManager,
  User,
  UserNotFoundError,
  UserUnAuthorizedError,
  VerificationRequiredError,
  VerificationService,
} from './types';
import { KnexUserService } from './userService';
import crypto from 'crypto';

export class DynamicAuthManager<TUser extends User> {
  private config: AuthConfig;
  private configSubscription?: any;
  private mfa?: MfaService;
  private rateLimiter?: RateLimiter;
  private verificationService?: VerificationService;

  constructor(
    private configStore: ConfigStore,
    private providers: Record<string, AuthProvider<TUser>>,
    private sessionManager: SessionManager,
    private userService: KnexUserService<TUser>,
    private refreshInterval = 5000,
    private enableConfigIntervalCheck = false,
    private internalConfig: AuthInternalConfig<TUser>
  ) {
    this.watchConfig();
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

  async register(
    provider: string,
    credentials: Partial<TUser>,
    password: string
  ): Promise<{ user: TUser; token: AuthToken | string | AuthRequiredType }> {
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
    const user = await authProvider.register(credentials, password);

    if (
      this.config.authPolicy.loginAfterRegistration &&
      !this.config.mfaSettings.required &&
      (!this.config.authPolicy.emailVerificationRequired ||
        !this.config.authPolicy.smsVerificationRequired)
    ) {
      const token = await this.sessionManager.createSession(user);
      return { user, token };
    }

    if (
      this.config.authPolicy.emailVerificationRequired &&
      !this.verificationService &&
      this.verificationService.sendVerificationEmail
    ) {
      await this.verificationService.sendVerificationEmail(user.email);
    }

    if (
      this.config.authPolicy.smsVerificationRequired &&
      !this.verificationService &&
      this.verificationService.sendVerificationSms &&
      user.phone
    ) {
      await this.verificationService.sendVerificationSms(user.phone);
    }

    return { user, token: '' };
  }

  async login(
    provider: string,
    credentials: Record<string, string>
  ): Promise<{ user: TUser; token: AuthToken | string | AuthRequiredType }> {
    if (!this.config.enabledProviders.includes(provider)) {
      throw new ProviderNotEnabled(provider);
    }

    if (this.rateLimiter) {
      const limit = await this.rateLimiter.checkLimit(credentials.email);
      if (!limit.allowed) throw new RateLimitExceededError();
    }

    const authProvider = this.providers[provider];
    if (!authProvider) throw new InvalidProvider();

    const user = await authProvider.authenticate(credentials);

    if (
      this.config.authPolicy.emailVerificationRequired &&
      !this.verificationService &&
      !user.email_verified
    ) {
      throw new VerificationRequiredError('email');
    }

    if (
      this.config.authPolicy.smsVerificationRequired &&
      !this.verificationService &&
      !user.phone_verified
    ) {
      throw new VerificationRequiredError('sms');
    }

    if (this.config.mfaSettings.required && this.mfa && !user.mfa_enabled) {
      throw new MFARequiredError();
    }

    const token =
      this.mfa && user.mfa_enabled
        ? 'mfa-required'
        : await this.sessionManager.createSession(user);
    return { user, token };
  }

  async refreshToken(refreshToken: string) {
    return this.sessionManager.refreshSession(refreshToken);
  }

  async validateToken(token: string): Promise<TUser> {
    const user = await this.sessionManager.verifySession(token);
    return user as TUser;
  }

  async logout(token: string): Promise<void> {
    await this.sessionManager.destroySession(token);
  }

  async verifyEmail(
    userId: string,
    verificationCode: string
  ): Promise<{ user: TUser; token: AuthToken | string }> {
    const user = await this.userService.findUser(userId);
    if (!user) throw new UserNotFoundError(userId);
    const isValid = this.verificationService.verifyEmail(
      user.email,
      verificationCode
    );
    if (!isValid) throw new InvalidCodeError();
    await this.userService.updateUser(user.id, {
      ...user,
      email_verified: true,
    });
    const token = await this.sessionManager.createSession(user);
    return { user, token };
  }

  async sendVerificationEmail(email: string) {
    const user = await this.userService.findUser(email);
    if (!user) throw new UserNotFoundError(email);
    await this.verificationService.sendVerificationEmail(email);
  }

  async sendVerificationSms(phone: string) {
    const user = await this.userService.findUser(phone);
    if (!user) throw new UserNotFoundError(phone);
    await this.verificationService.sendVerificationSms(phone);
  }

  async verifySms(userId: string, verificationCode: string) {
    const user = await this.userService.findUser(userId);
    if (!user) throw new UserNotFoundError(userId);
    const isValid = this.verificationService.verifySms(verificationCode);
    if (!isValid) throw new InvalidCodeError();
    await this.userService.updateUser(user.id, {
      ...user,
      phone_verified: true,
    });
    const token = await this.sessionManager.createSession(user);
    return { user, token };
  }

  // Add password reset functionality
  // TODO: fix properly
  async resetPassword(userId: string, newPassword: string): Promise<void> {
    const hash = await hashPassword(newPassword);
    await this.internalConfig
      .knex(this.userService.getTable())
      .where(this.userService.getColumns().id, userId)
      .update({
        [this.userService.getColumns().passwordHash]: hash,
        [this.userService.getColumns().updatedAt]: this.userService
          .getInternalConfig()
          .knex.fn.now(),
      });
  }

  //TODO: fix mfa required flow properly
  async verifyMfa(userId: string, code: string) {
    const user = await this.userService.findUser(userId);
    const isValid = this.mfa.verifyCode(user.mfa_secret, code);

    if (!isValid) {
      const validRecovery = user.mfa_recovery_codes.includes(code);
      if (!validRecovery) throw new InvalidMfaCodeError();
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
    const user = await this.userService.findUser(userId);
    if (!user) throw new UserNotFoundError(userId);
    if (!user.mfa_enabled) throw new MfaAlreadyEnabledError(userId);
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
