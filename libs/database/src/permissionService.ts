import type { Knex } from 'knex';
import { FG_PERMISSION_TABLE, type TablePermissions } from './types';
import { LRUCache } from 'lru-cache';

class PermissionService {
  private cache: LRUCache<string, TablePermissions>;
  constructor(private knex: Knex) {
    this.cache = new LRUCache({
      max: 500, // Maximum number of items in the cache
      ttl: 5 * 60 * 1000, // 5 minutes TTL
      allowStale: false,
      updateAgeOnGet: true,
    });
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    const hasTable = await this.knex.schema.hasTable(FG_PERMISSION_TABLE);
    if (!hasTable) {
      await this.knex.schema.createTable(FG_PERMISSION_TABLE, (table) => {
        table.string('table_name').primary().unique().notNullable();
        table.json('permissions').notNullable();
        table.timestamps(true, true);
      });
    }
  }

  async getPermissionsForTable(
    tableName: string,
    trx?: Knex.Transaction
  ): Promise<TablePermissions | any> {
    // Check cache first
    const cachedPermissions = this.cache.get(tableName);
    if (cachedPermissions) {
      return cachedPermissions;
    }

    // If not in cache, fetch from database
    // Use transaction if provided, otherwise use the knex instance
    const queryBuilder = trx ? trx : this.knex;
    const result = await queryBuilder(FG_PERMISSION_TABLE)
      .where({ table_name: tableName })
      .first();

    if (!result) return {};

    const permissions = JSON.parse(result.permissions);
    this.cache.set(tableName, permissions);
    return permissions;
  }

  async setPermissionsForTable(
    tableName: string,
    permissions: TablePermissions,
    trx?: Knex.Transaction
  ): Promise<TablePermissions> {
    // Use transaction if provided, otherwise use the knex instance
    const queryBuilder = trx ? trx : this.knex;
    await queryBuilder(FG_PERMISSION_TABLE)
      .insert({
        table_name: tableName,
        permissions: JSON.stringify(permissions),
      })
      .onConflict('table_name')
      .merge();

    // Update cache
    this.cache.set(tableName, permissions);

    return permissions;
  }

  async deletePermissionsForTable(
    tableName: string,
    trx?: Knex.Transaction
  ): Promise<void> {
    // Use transaction if provided, otherwise use the knex instance
    const queryBuilder = trx ? trx : this.knex;
    await queryBuilder(FG_PERMISSION_TABLE)
      .where({ table_name: tableName })
      .delete();

    // Remove from cache
    this.cache.delete(tableName);
  }

  // Method to clear the entire cache
  clearCache(): void {
    this.cache.clear();
  }
}

// Don't export the instance directly, we'll initialize it in index.ts
export { PermissionService };
