import { BaseProvider } from '../providers/factory';
import { providerRegistry } from '../providers/registry';
import { z } from 'zod';

// Example schema for a custom password provider
const passwordConfigSchema = z.object({
  minLength: z.number().min(8).default(8),
  requireSpecialChars: z.boolean().default(true),
  requireNumbers: z.boolean().default(true),
});

type PasswordConfig = z.infer<typeof passwordConfigSchema>;

// Example custom provider implementation
class PasswordProvider extends BaseProvider {
  type = 'password';
  protected passwordConfig!: PasswordConfig;

  async validateConfig(config: unknown): Promise<void> {
    this.passwordConfig = passwordConfigSchema.parse(config);
  }

  async authenticate(credentials: {
    username: string;
    password: string;
  }): Promise<{ id: string }> {
    // Example authentication logic
    if (credentials.password.length < this.passwordConfig.minLength) {
      throw new Error('Password too short');
    }

    // In a real implementation, you would verify against a database
    return { id: credentials.username };
  }
}

// Example email magic link provider
const emailConfigSchema = z.object({
  from: z.string().email(),
  subject: z.string(),
  tokenExpiry: z.number().min(60).default(3600),
});

type EmailConfig = z.infer<typeof emailConfigSchema>;

class EmailMagicLinkProvider extends BaseProvider {
  type = 'email-magic-link';
  protected emailConfig!: EmailConfig;

  async validateConfig(config: unknown): Promise<void> {
    this.emailConfig = emailConfigSchema.parse(config);
  }

  async authenticate(credentials: { token: string }): Promise<{ id: string }> {
    // Example token verification logic
    return { id: 'user-id' };
  }
}

// Register providers directly
export const registerCustomProviders = () => {
  // Register password provider
  providerRegistry.registerProvider('password', PasswordProvider);

  // Register email magic link provider
  providerRegistry.registerProvider('email-magic-link', EmailMagicLinkProvider);
};

// Example usage:
/*
await providerRegistry.configureProvider('password', {
  minLength: 10,
  requireSpecialChars: true,
  requireNumbers: true
});

await providerRegistry.configureProvider('email-magic-link', {
  from: 'auth@example.com',
  subject: 'Sign in to Your Account',
  tokenExpiry: 1800
});
*/
