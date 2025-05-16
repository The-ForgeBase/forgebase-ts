import { Knex } from 'knex';
import { ConfigStore, AuthConfig, AuthConfigSchema } from '../types.js';
import { AuthConfigTable } from './index.js';

export class KnexConfigStore implements ConfigStore {
  private tableName = AuthConfigTable;
  private knex: Knex;
  private cacheTTL = 30000; // 30 seconds cache

  constructor(
    knex: Knex,
    cacheTTL = 30000, // 30 seconds cache
  ) {
    this.knex = knex;
    this.cacheTTL = cacheTTL;
  }

  async initialize(): Promise<void> {
    await this.getConfig();
  }

  private cache = {
    value: null as AuthConfig | null,
    expires: 0,
  };

  async getConfig(): Promise<AuthConfig> {
    if (Date.now() < this.cache.expires) return this.cache.value!;

    const result = await this.knex(this.tableName)
      .orderBy('created_at', 'desc')
      .first();

    if (!result) {
      const defaultConfig = AuthConfigSchema.parse({
        authPolicy: {
          allowEmailAuth: true,
          allowPhoneAuth: true,
          allowOAuthAuth: true,
          requireEmailVerification: false,
          requirePhoneVerification: false,
        },
        passwordPolicy: {
          minLength: 8,
          requireNumbers: true,
          requireSpecialChars: true,
          requireUppercase: true,
          requireLowercase: true,
        },
        sessionSettings: {
          accessTokenTTL: '1h', // 1 hour
          refreshTokenTTL: '30d', // 30 days
          cookieSecure: true,
          cookieSameSite: 'lax',
        },
        mfaSettings: {
          enabled: false,
          issuer: 'ForgeBase',
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
        },
      });
      const [id] = await this.knex(this.tableName)
        .insert({ config: JSON.stringify(defaultConfig) })
        .returning('id');
      const configWithId = { ...defaultConfig, id: id.id };
      this.cache = { value: configWithId, expires: Date.now() + this.cacheTTL };
      return configWithId;
    }

    // console.log(
    //   'Loaded config from database:',
    //   typeof result.config === 'string'
    //     ? result.config
    //     : JSON.stringify(result.config, null, 2)
    // );

    // Parse the JSON string into an object before validating with Zod
    const configObject =
      typeof result.config === 'string'
        ? JSON.parse(result.config)
        : result.config;

    const parsed = AuthConfigSchema.parse(configObject);
    this.cache = { value: parsed, expires: Date.now() + this.cacheTTL };
    return parsed;
  }

  async updateConfig(update: Partial<AuthConfig>): Promise<AuthConfig> {
    const current = await this.getConfig();
    const updated = AuthConfigSchema.parse({ ...current, ...update });
    // console.log('Current config:', current);
    // console.log('Updating config in database:', updated);

    await this.knex(this.tableName)
      .where('id', current.id)
      .update({
        config: JSON.stringify(updated),
        updated_at: this.knex.fn.now(),
      });
    this.cache = { value: updated, expires: Date.now() + this.cacheTTL };

    return updated;
  }
}
