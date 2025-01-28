import { Knex } from 'knex';
import { ConfigStore, AuthConfig, AuthConfigSchema } from '../types';

export class KnexConfigStore implements ConfigStore {
  private tableName = 'auth_config';

  constructor(
    private knex: Knex,
    private cacheTTL = 30000 // 30 seconds cache
  ) {}

  async initialize() {
    await this.knex.schema.createTableIfNotExists(this.tableName, (table) => {
      table.increments('id');
      table.jsonb('config').notNullable();
      table.timestamp('created_at').defaultTo(this.knex.fn.now());
      table.timestamp('updated_at').defaultTo(this.knex.fn.now());
    });

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
      const defaultConfig = AuthConfigSchema.parse({});
      await this.knex(this.tableName).insert({ config: defaultConfig });
      return defaultConfig;
    }

    const parsed = AuthConfigSchema.parse(result.config);
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
