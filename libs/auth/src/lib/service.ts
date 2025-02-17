import { ConfigurationManager } from '../config/configuration';
import { providerRegistry } from '../providers/registry';
import { AuthenticationStrategy } from '../providers/strategy';
import { pluginManager } from './plugins';
import { authEvents } from './events';

export interface AuthConfig {
  providers?: Record<
    string,
    {
      type?: string;
      enabled?: boolean;
      config?: Record<string, any>;
    }
  >;
  session?: {
    storage?: 'memory' | 'redis' | 'database';
    ttl?: number;
    updateAge?: number;
  };
  jwt?: {
    secret?: string;
    expiresIn?: string; // Changed from string | number to just string
  };
}

export class AuthService {
  private strategy: AuthenticationStrategy;
  private configManager: ConfigurationManager;
  private config: AuthConfig;

  constructor(initialConfig: AuthConfig) {
    this.config = initialConfig;
    this.configManager = new ConfigurationManager(initialConfig);

    // Initialize strategy with configured providers
    const providers = new Map();
    const configuredProviders = Object.entries(initialConfig.providers || {});
    for (const [type, config] of configuredProviders) {
      if (config.enabled) {
        const provider = providerRegistry.getProvider(type);
        if (provider) {
          providers.set(type, provider);
        }
      }
    }

    this.strategy = new AuthenticationStrategy(providers);

    // Listen for configuration changes
    this.configManager.onConfigChange(async (newConfig) => {
      await pluginManager.notifyPlugins('onConfigChange', newConfig);
      await authEvents.emit('auth:config:updated', { config: newConfig });
    });
  }

  async updateConfig(config: AuthConfig): Promise<void> {
    this.config = config;
    await this.configManager.updateConfig(config);
  }

  async authenticate(
    type: string,
    credentials: unknown
  ): Promise<{ id: string; [key: string]: any }> {
    const providerConfig = this.config.providers?.[type];

    if (!providerConfig?.enabled) {
      throw new Error(`Provider '${type}' is disabled`);
    }

    const result = await this.strategy.authenticate(type, credentials);
    await pluginManager.notifyPlugins('onAuthenticate', result.id, result);
    return result;
  }

  async signOut(userId: string): Promise<void> {
    await pluginManager.notifyPlugins('onSignOut', userId);
    await authEvents.emit('auth:user:deauthenticated', { userId });
  }

  getConfig(): AuthConfig {
    return this.config;
  }
}
