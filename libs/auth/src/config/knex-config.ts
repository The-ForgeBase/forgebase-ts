import { Knex } from 'knex';
import { ConfigStore, AuthConfig, AuthConfigSchema } from '../types';
import { AuthConfigTable } from '.';

export class KnexConfigStore implements ConfigStore {
  private tableName = AuthConfigTable;

  constructor(
    private knex: Knex,
    private cacheTTL = 30000 // 30 seconds cache
  ) {}

  // async initialize(): Promise<void> {
  //   console.log('Initializing config store...');
  //   const hasTable = await this.knex.schema.hasTable(this.tableName);
  //   if (!hasTable) {
  //     console.log('Creating config table...');
  //     await this.knex.schema.createTable(this.tableName, (table) => {
  //       table.increments('id');
  //       table.text('config').notNullable();
  //       table.timestamp('created_at').defaultTo(this.knex.fn.now());
  //       table.timestamp('updated_at').defaultTo(this.knex.fn.now());
  //     });
  //   }

  //   await this.getConfig();
  //   this.initialized = true;
  // }

  private cache = {
    value: null as AuthConfig | null,
    expires: 0,
  };

  async getConfig(): Promise<AuthConfig> {
    if (Date.now() < this.cache.expires) return this.cache.value;

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
      // console.log('Inserting default config:', defaultConfig);
      // console.log('Default config JSON:', JSON.stringify(defaultConfig));
      const [id] = await this.knex(this.tableName)
        .insert({ config: JSON.stringify(defaultConfig) })
        .returning('id');
      console.log('Inserted default config with ID:', id);
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
