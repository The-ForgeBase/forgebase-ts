import type { Knex } from "knex";
import type { TablePermissions } from "./types";
import { LRUCache } from "lru-cache";

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
    const hasTable = await this.knex.schema.hasTable("table_permissions");
    if (!hasTable) {
      await this.knex.schema.createTable("table_permissions", (table) => {
        table.string("table_name").primary().unique().notNullable();
        table.json("permissions").notNullable();
        table.timestamps(true, true);
      });
    }
  }

  async getPermissionsForTable(
    tableName: string
  ): Promise<TablePermissions | undefined> {
    // Check cache first
    const cachedPermissions = this.cache.get(tableName);
    if (cachedPermissions) {
      return cachedPermissions;
    }

    // If not in cache, fetch from database
    const result = await this.knex("table_permissions")
      .where({ table_name: tableName })
      .first();

    if (!result) return undefined;

    const permissions = JSON.parse(result.permissions);
    this.cache.set(tableName, permissions);
    return permissions;
  }

  async setPermissionsForTable(
    tableName: string,
    permissions: TablePermissions
  ): Promise<void> {
    await this.knex("table_permissions")
      .insert({
        table_name: tableName,
        permissions: JSON.stringify(permissions),
      })
      .onConflict("table_name")
      .merge();

    // Update cache
    this.cache.set(tableName, permissions);
  }

  async deletePermissionsForTable(tableName: string): Promise<void> {
    await this.knex("table_permissions")
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
