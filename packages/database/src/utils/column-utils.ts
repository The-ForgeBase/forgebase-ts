import {
  Kysely,
  sql,
  type CreateTableBuilder,
  type AlterTableBuilder,
  type AlterTableColumnAlteringBuilder,
  type ColumnDefinitionBuilder,
  type ColumnDataType,
  type Expression,
  type Transaction,
} from 'kysely';
import type { ColumnDefinition, UpdateColumnDefinition } from '../types';
// import { SchemaInspector } from '../knex-schema-inspector/lib/index'; // Removed
import { DBInspector } from './inspector'; // Use our new inspector
import { uuid } from './db';

// DataTypeExpression is not exported from Kysely index, so we define it here
type DataTypeExpression = ColumnDataType | Expression<any>;

// Helper type for builders that support addColumn
type SchemaBuilder =
  | CreateTableBuilder<any, any>
  | AlterTableBuilder
  | AlterTableColumnAlteringBuilder;

export function createColumn(
  builder: SchemaBuilder, // CreateTableBuilder or AlterTableBuilder
  columnDef: ColumnDefinition,
  db: Kysely<any>, // We need db instance for sql helper
) {
  const { name, type } = columnDef;
  let dataType: DataTypeExpression = 'text'; // Default to text to satisfy type, will be overwritten
  let constraints: any[] = [];

  // Map Knex types to Kysely/SQL types
  switch (type) {
    case 'increments':
      dataType = 'integer';
      break;
    case 'enum':
      // Enum handling in Kysely is dialect constants usually or separate createType
      // For simplicity, we might fall back to text with check constraint or native enum if created
      // adhering to existing logic:
      if (!columnDef.enumValues) {
        throw new Error('Enum values are required');
      }
      // For now, treat as text/varchar for SQLite compatibility or handle specifically
      // Kysely doesnt have a direct 'enum' method on column builder that works everywhere without createType
      dataType = 'text';
      constraints.push((col: ColumnDefinitionBuilder) =>
        col.check(
          sql`${sql.ref(name)} in (${sql.join(columnDef.enumValues!)})`,
        ),
      );
      break;
    case 'uuid':
      // Basic uuid handling
      dataType = 'uuid';
      // We might need dialect check here if we want to support SQLite specifically as text(36)
      break;
    default:
      // Try passing raw strings
      dataType = type as DataTypeExpression;
  }

  // SQLite uuid callback override simulation
  // if (['Client_SQLite3', ...].includes(...)) ... -> Kysely: db.introspection.getMetadata() ...
  // For now assuming standard types or relying on driver translation

  return builder.addColumn(name, dataType, (col: ColumnDefinitionBuilder) => {
    let c = col;

    // Apply collected constraints (like enum checks)
    for (const constraint of constraints) {
      c = constraint(c);
    }

    if (columnDef.unique) c = c.unique();
    if (columnDef.nullable === false) c = c.notNull();

    if (columnDef.default !== undefined) {
      c = c.defaultTo(columnDef.default);
    }

    // Auto timestamps
    if (columnDef.name === 'created_at' || columnDef.name === 'updated_at') {
      c = c.defaultTo(sql`now()`);
    }

    if (columnDef.type === 'uuid') {
      const adapter = db.getExecutor().adapter;
      const adapterName = adapter.constructor.name;

      if (adapterName.includes('Postgres')) {
        c = c.defaultTo(sql`gen_random_uuid()`);
      } else if (adapterName.includes('Sqlite')) {
        c = c.defaultTo(uuid);
      }
    }

    if (columnDef.type === 'increments') {
      c = c.autoIncrement();
    }

    if (columnDef.primary) c = c.primaryKey();

    if (columnDef.foreignKeys) {
      c = c.references(
        `${columnDef.foreignKeys.references.tableName}.${columnDef.foreignKeys.references.columnName}`,
      );
    }

    return c;
  });
}

// Helper function to check for foreign keys

async function dropExistingForeignKeys(
  db: Kysely<any>,
  tableName: string,
  columnName: string,
) {
  const inspector = new DBInspector(db);
  const tableInfo = await inspector.getTableInfo(tableName);

  // Find FKs where the *source* column is the one we are modifying
  // The inspector returns FKs for the table, showing which column points to what.
  const fks = tableInfo.foreignKeys.filter((fk) => fk.column === columnName);

  for (const fk of fks) {
    if (fk.constraintName) {
      await db.schema
        .alterTable(tableName)
        .dropConstraint(fk.constraintName)
        .execute();
    } else {
      console.warn(
        `Could not drop FK for ${tableName}.${columnName} because constraint name is missing.`,
      );
    }
  }
}

// Update column function using drop and recreate approach
export async function updateColumn(
  db: Kysely<any>,
  tableName: string,
  columnDef: UpdateColumnDefinition,
  trx?: Transaction<any>, // Transaction
) {
  // Use transaction if provided, otherwise use the db instance
  const executor = trx || db;

  // 1. Check and drop existing FKs
  // We use the 'db' instance for inspection even if inside a transaction for reading metadata if needed,
  // but better to use executor if inspector supported it. Inspector currently takes 'Kysely<any>'.
  // If 'trx' is passed, we might face issues if inspector expects Kysely instance.
  // Ideally DBInspector should accept Kysely | Transaction.
  // For now, we use 'db' for inspection as schema read usually doesn't need to be in the same trx unless strictly isolatedDDL.
  await dropExistingForeignKeys(db, tableName, columnDef.currentName);

  // 2. Drop existing column
  await executor.schema
    .alterTable(tableName)
    .dropColumn(columnDef.currentName)
    .execute();

  // 3. Recreate column
  let alterBuilder = executor.schema.alterTable(tableName);

  // We need to map UpdateColumnDefinition to ColumnDefinition for createColumn
  const newColDef: ColumnDefinition = {
    name: columnDef.newName || columnDef.currentName,
    type: columnDef.type || columnDef.currentType,
    nullable: columnDef.nullable ?? true,
    primary: columnDef.primary,
    unique: columnDef.unique,
    foreignKeys: columnDef.foreignKeys,
    default: columnDef.default,
    enumValues: undefined, // Not present in UpdateColumnDefinition?
  };

  createColumn(alterBuilder, newColDef, db).execute();
}
