import { randomBytes, createHash } from 'crypto';
import { AuthProvider, User } from '../../../types';
import { MagicLinkProvider } from './magic-link-provider';
import { EmailService, DefaultEmailService } from './email-service';
import { AuthPlugin } from '../../types';
import { DynamicAuthManager } from '../../../authManager';

/**
 * Plugin for magic link authentication (passwordless email login)
 */
export class MagicLinkPlugin<TUser extends User> implements AuthPlugin<TUser> {
  name = 'magic-link';
  version = '1.0.0';

  private provider: MagicLinkProvider<TUser>;
  private tokenStorage: Map<
    string,
    { userId: string; email: string; expires: number }
  > = new Map();
  private tokenExpiryMs: number;
  private baseUrl: string;
  private emailService: EmailService;
  private authManager?: DynamicAuthManager<TUser>;

  constructor(options: {
    tokenExpirySeconds?: number;
    baseUrl: string;
    emailService?: EmailService;
  }) {
    this.tokenExpiryMs = (options.tokenExpirySeconds || 3600) * 1000;
    this.baseUrl = options.baseUrl;
    this.emailService = options.emailService || new DefaultEmailService();

    // Create the provider that will be registered with auth system
    this.provider = new MagicLinkProvider<TUser>(this);
  }

  async initialize(authManager: DynamicAuthManager<TUser>): Promise<void> {
    console.log('Magic Link Authentication plugin initialized');
    this.authManager = authManager;

    // Set up a cleanup job to remove expired tokens
    setInterval(() => this.cleanupExpiredTokens(), 60000); // Every minute
  }

  getProviders(): Record<string, AuthProvider<TUser>> {
    return {
      magicLink: this.provider,
    };
  }

  getHooks() {
    return {
      beforeLogin: async (data: any) => {
        if (data.provider === 'magicLink') {
          console.log(
            'Magic link authentication requested for:',
            data.credentials.email
          );
        }
      },
      afterLogin: async (data: any) => {
        if (data.provider === 'magicLink' && data.user) {
          console.log(
            'Magic link authentication successful for:',
            data.user.email
          );
        }
      },
    };
  }

  async generateMagicLink(email: string): Promise<string | null> {
    if (!this.authManager) {
      throw new Error('Plugin not initialized');
    }

    // Use the userService from authManager to find the user by email
    const userService = this.authManager.getUserService();
    const user = await userService.findUserByEmail(email);

    if (!user) {
      console.log(`No user found with email: ${email}`);
      return null;
    }

    // Generate a secure token
    const token = this.generateSecureToken();
    const hashedToken = this.hashToken(token);

    // Store the token with expiry
    this.tokenStorage.set(hashedToken, {
      userId: user.id,
      email: user.email,
      expires: Date.now() + this.tokenExpiryMs,
    });

    // Generate the magic link URL
    const magicLink = `${this.baseUrl}/auth/verify-magic-link?token=${token}`;

    // Send the email
    await this.emailService.sendMagicLinkEmail(user.email, magicLink);

    return magicLink;
  }

  async verifyMagicLink(token: string): Promise<TUser | null> {
    if (!this.authManager) {
      throw new Error('Plugin not initialized');
    }

    // Hash the token to look it up
    const hashedToken = this.hashToken(token);
    const storedToken = this.tokenStorage.get(hashedToken);

    // Check if token exists and is not expired
    if (!storedToken || storedToken.expires < Date.now()) {
      return null;
    }

    // Use the userService to get the user
    const userService = this.authManager.getUserService();
    const user = await userService.findUserById(storedToken.userId);

    // Delete the token after use (one-time use)
    this.tokenStorage.delete(hashedToken);

    return user;
  }

  private generateSecureToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [key, value] of this.tokenStorage.entries()) {
      if (value.expires < now) {
        this.tokenStorage.delete(key);
      }
    }
  }

  async cleanup(): Promise<void> {
    // Clean up resources used by the plugin
    this.tokenStorage.clear();
  }
}
