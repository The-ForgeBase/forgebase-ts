import { type Kysely, sql } from 'kysely';

export interface ColumnInfo {
  name: string;
  defaultValue: any;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  hasAutoIncrement: boolean;
  hasDefaultValue: boolean;
  foreignKeyReference?: {
    table: string;
    column: string;
  };
}

export interface ForeignKeyInfo {
  table: string;
  column: string;
  foreignTable: string;
  foreignColumn: string;
  constraintName?: string;
  onDelete?: string;
  onUpdate?: string;
}

export interface TableInfo {
  columns: ColumnInfo[];
  foreignKeys: ForeignKeyInfo[];
  //indexes: any;
}

export interface DatabaseSchema {
  [tableName: string]: TableInfo;
}

export class DBInspector {
  constructor(private db: Kysely<any>) {}

  private getDialect(): 'postgres' | 'sqlite' | 'unknown' {
    const adapter = this.db.getExecutor().adapter;
    // Check adapter name or class
    // Kysely adapters: PostgresAdapter, SqliteAdapter
    const name = adapter.constructor.name;
    if (name.includes('Postgres')) return 'postgres';
    if (name.includes('Sqlite')) return 'sqlite';
    // Fallback check if class name is minified or different
    // We can check supportsTransactionalDdl as a heuristic? No.
    return 'unknown';
  }

  async getTables(): Promise<string[]> {
    const tables = await this.db.introspection.getTables();
    return tables.map((t) => t.name);
  }

  async hasTable(tableName: string): Promise<boolean> {
    const dialect = this.getDialect();

    try {
      if (dialect === 'postgres') {
        const result = await sql<{ exists: boolean }>`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = ${tableName}
          ) as "exists"
        `.execute(this.db);
        return !!result.rows[0]?.exists;
      } else if (dialect === 'sqlite') {
        const result = await sql<{ name: string }>`
          SELECT name FROM sqlite_master
          WHERE type='table' AND name=${tableName}
        `.execute(this.db);
        return result.rows.length > 0;
      }
    } catch (e) {
      console.warn(`Failed to check table existence for ${tableName}:`, e);
    }

    // Fallback to introspection if optimized check fails
    const tables = await this.db.introspection.getTables();
    return tables.some((t) => t.name === tableName);
  }

  async getTableInfo(tableName: string): Promise<TableInfo> {
    const tables = await this.db.introspection.getTables();
    const tableMetadata = tables.find((t) => t.name === tableName);

    if (!tableMetadata) {
      throw new Error(`Table ${tableName} not found`);
    }

    const dialect = this.getDialect();
    let primaryKeys: string[] = [];
    let foreignKeys: ForeignKeyInfo[] = [];

    if (dialect === 'postgres') {
      try {
        // Get Primary Keys
        const pkResult = await sql<{ column_name: string }>`
          SELECT kcu.column_name
          FROM information_schema.key_column_usage kcu
          JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name
          WHERE kcu.table_name = ${tableName} AND tc.constraint_type = 'PRIMARY KEY'
        `.execute(this.db);
        primaryKeys = pkResult.rows.map((r) => r.column_name);

        // Get Foreign Keys
        const fkResult = await sql<{
          column_name: string;
          foreign_table_name: string;
          foreign_column_name: string;
          constraint_name: string;
        }>`
          SELECT
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            tc.constraint_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = ${tableName}
        `.execute(this.db);

        foreignKeys = fkResult.rows.map((r) => ({
          table: tableName,
          column: r.column_name,
          foreignTable: r.foreign_table_name,
          foreignColumn: r.foreign_column_name,
          constraintName: r.constraint_name,
        }));
      } catch (e) {
        console.warn(
          `Failed to inspect Postgres constraints for ${tableName}:`,
          e,
        );
      }
    } else if (dialect === 'sqlite') {
      try {
        // Get Primary Keys
        // PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
        const pkResult = await sql<{ name: string; pk: number }>`
          PRAGMA table_info(${sql.table(tableName)})
        `.execute(this.db);
        primaryKeys = pkResult.rows.filter((r) => r.pk > 0).map((r) => r.name);

        // Get Foreign Keys
        // PRAGMA foreign_key_list returns: id, seq, table, from, to, on_update, on_delete, match
        const fkResult = await sql<{
          table: string;
          from: string;
          to: string;
          on_update: string;
          on_delete: string;
        }>`
          PRAGMA foreign_key_list(${sql.table(tableName)})
        `.execute(this.db);

        // SQLite foreign_key_list 'table' is the foreign table
        // 'from' is the column in current table, 'to' is column in foreign table
        foreignKeys = fkResult.rows.map((r) => ({
          table: tableName,
          column: r.from,
          foreignTable: r.table,
          foreignColumn: r.to,
          onUpdate: r.on_update,
          onDelete: r.on_delete,
        }));
      } catch (e) {
        console.warn(
          `Failed to inspect SQLite constraints for ${tableName}:`,
          e,
        );
      }
    }

    const columns: ColumnInfo[] = tableMetadata.columns.map((col) => {
      const isPk = primaryKeys.includes(col.name);

      // Find generic FK info if exists
      const fk = foreignKeys.find((f) => f.column === col.name);

      return {
        name: col.name,
        defaultValue: (col as any).defaultValue,
        dataType: col.dataType,
        isNullable: col.isNullable,
        isPrimaryKey: isPk,
        hasDefaultValue: col.hasDefaultValue,
        hasAutoIncrement: col.isAutoIncrementing,
        foreignKeyReference: fk
          ? {
              table: fk.foreignTable,
              column: fk.foreignColumn,
            }
          : undefined,
      };
    });

    return {
      columns,
      foreignKeys,
      //indexes,
    };
  }

  async getDatabaseSchema(excludedTables: string[]): Promise<DatabaseSchema> {
    let tables = await this.getTables();
    tables = tables.filter((t) => !excludedTables.includes(t));
    const schema: DatabaseSchema = {};

    for (const table of tables) {
      schema[table] = await this.getTableInfo(table);
    }

    return schema;
  }
}
