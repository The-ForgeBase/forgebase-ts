import { Kysely, sql, Transaction } from 'kysely';
import { FG_PERMISSION_TABLE, type TablePermissions } from './types';
import { LRUCache } from 'lru-cache';

export class PermissionService {
  private cache: LRUCache<string, TablePermissions>;
  // @ts-ignore
  private db: Kysely<any>;
  private initPromise: Promise<void>;

  constructor(db: Kysely<any>) {
    this.db = db;
    this.cache = new LRUCache({
      max: 500,
      ttl: 5 * 60 * 1000, // 5 minutes TTL
      allowStale: false,
      updateAgeOnGet: true,
    } as any);
    this.initPromise = this.initializeDatabase();
  }

  async ready(): Promise<void> {
    return this.initPromise;
  }

  private async initializeDatabase() {
    try {
      const adapterName = this.db.getExecutor().adapter.constructor.name;
      const isSqlite =
        adapterName.includes('Sqlite') || adapterName.includes('Libsql');
      const now = isSqlite ? sql`CURRENT_TIMESTAMP` : sql`now()`;

      await this.db.schema
        .createTable(FG_PERMISSION_TABLE)
        .ifNotExists()
        .addColumn('table_name', 'varchar(255)', (col) =>
          col.primaryKey().notNull(),
        )
        .addColumn('permissions', 'json', (col) => col.notNull())
        .addColumn('created_at', 'timestamp', (col) => col.defaultTo(now))
        .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(now))
        .execute();
    } catch (e) {
      console.warn('Permission table initialization warning:', e);
    }
  }

  /**
   * Sync-only lookup: returns cached permissions or undefined if not cached.
   * Avoids async overhead when the permission is already in the LRU cache.
   */
  getPermissionsForTableSync(tableName: string): TablePermissions | undefined {
    return this.cache.get(tableName);
  }

  async getPermissionsForTable(
    tableName: string,
    trx?: Transaction<any> | Kysely<any>,
  ): Promise<TablePermissions | any> {
    const cachedPermissions = this.cache.get(tableName);
    if (cachedPermissions) {
      return cachedPermissions;
    }

    const executor = trx || this.db;
    const result = await executor
      .selectFrom(FG_PERMISSION_TABLE)
      .where('table_name', '=', tableName)
      .selectAll()
      .executeTakeFirst();

    if (!result) return {};

    let permissions = result.permissions;

    if (typeof permissions === 'string') {
      try {
        permissions = JSON.parse(permissions);
      } catch (e) {
        // ignore
      }
    }

    this.cache.set(tableName, permissions);
    return permissions;
  }

  async setPermissionsForTable(
    tableName: string,
    permissions: TablePermissions,
    trx?: Transaction<any> | Kysely<any>,
  ): Promise<TablePermissions> {
    const executor = trx || this.db;
    const permissionsJson = JSON.stringify(permissions);

    const adapterName = this.db.getExecutor().adapter.constructor.name;
    const isSqlite =
      adapterName.includes('Sqlite') || adapterName.includes('Libsql');
    const now = isSqlite ? sql`CURRENT_TIMESTAMP` : sql`now()`;

    await executor
      .insertInto(FG_PERMISSION_TABLE)
      .values({
        table_name: tableName,
        permissions: permissionsJson,
        updated_at: now,
      })
      .onConflict((oc: any) =>
        oc.column('table_name').doUpdateSet({
          permissions: permissionsJson,
          updated_at: now,
        }),
      )
      .execute();

    this.cache.set(tableName, permissions);
    return permissions;
  }

  async deletePermissionsForTable(
    tableName: string,
    trx?: Transaction<any> | Kysely<any>,
  ): Promise<void> {
    const executor = trx || this.db;
    await executor
      .deleteFrom(FG_PERMISSION_TABLE)
      .where('table_name', '=', tableName)
      .execute();

    // Remove from cache
    this.cache.delete(tableName);
  }

  // Method to clear the entire cache
  clearCache(): void {
    this.cache.clear();
  }
}
