import { Knex } from 'knex';
import { ConfigStore, AuthConfig, AuthConfigSchema } from '../types';

export class KnexConfigStore implements ConfigStore {
  private tableName = 'auth_config';

  constructor(
    private knex: Knex,
    private cacheTTL = 30000 // 30 seconds cache
  ) {}

  async initialize() {
    const hasTable = await this.knex.schema.hasTable(this.tableName);
    if (!hasTable) {
      await this.knex.schema.createTable(this.tableName, (table) => {
        table.increments('id');
        table.json('config').notNullable();
        table.timestamp('created_at').defaultTo(this.knex.fn.now());
        table.timestamp('updated_at').defaultTo(this.knex.fn.now());
      });
    }

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
          allowPhoneAuth: false,
          allowOAuthAuth: true,
          requireEmailVerification: true,
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
          accessTokenTTL: '3600', // 1 hour
          refreshTokenTTL: '2592000', // 30 days
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
      console.log('Inserting default config:', typeof defaultConfig);
      const [id] = await this.knex(this.tableName)
        .insert({ config: defaultConfig })
        .returning('id');
      const configWithId = { ...defaultConfig, id };
      this.cache = { value: configWithId, expires: Date.now() + this.cacheTTL };
      return configWithId;
    }

    console.log('Loaded config from database:', typeof result.config);

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

    await this.knex(this.tableName)
      .where('id', current.id)
      .update({ config: updated, updated_at: this.knex.fn.now() });
    this.cache = { value: updated, expires: Date.now() + this.cacheTTL };

    return updated;
  }
}
