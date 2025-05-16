import type { Knex } from 'knex';
import type { ColumnDefinition, UpdateColumnDefinition } from '../types';
import { SchemaInspector } from '../knex-schema-inspector/lib/index';

export function createColumn(
  table: Knex.TableBuilder,
  columnDef: ColumnDefinition,
  knex: Knex
) {
  let column;

  switch (columnDef.type) {
    case 'increments':
      column = table.increments(columnDef.name);
      break;
    case 'string':
      column = table.string(columnDef.name);
      break;
    case 'text':
      column = table.text(columnDef.name, 'longtext');
      break;
    case 'integer':
      column = table.integer(columnDef.name);
      break;
    case 'bigInteger':
      column = table.bigInteger(columnDef.name);
      break;
    case 'boolean':
      column = table.boolean(columnDef.name);
      break;
    case 'decimal':
      column = table.decimal(columnDef.name);
      break;
    case 'float':
      column = table.float(columnDef.name);
      break;
    case 'datetime':
      column = table.datetime(columnDef.name);
      break;
    case 'date':
      column = table.date(columnDef.name);
      break;
    case 'time':
      column = table.time(columnDef.name);
      break;
    case 'timestamp':
      column = table.timestamp(columnDef.name);
      break;
    case 'binary':
      column = table.binary(columnDef.name);
      break;
    case 'json':
      column = table.json(columnDef.name);
      break;
    case 'jsonb':
      column = table.jsonb(columnDef.name);
      break;
    case 'enum':
      if (!columnDef.enumValues) {
        throw new Error('Enum values are required');
      }
      column = table.enum(columnDef.name, columnDef.enumValues);
      break;
    case 'uuid':
      if (
        ['Client_SQLite3', 'Client_BetterSQLite3', 'Client_Libsql'].includes(
          knex.client.constructor.name
        )
      ) {
        column = table.string(columnDef.name, 36);
        break;
      } else {
        column = table.uuid(columnDef.name);
        break;
      }
    default:
      throw new Error(`Unsupported column type: ${columnDef.type}`);
  }

  // add createdAt and updatedAt columns
  if (knex) {
    try {
      if (columnDef.name === 'created_at') column.defaultTo(knex.fn.now());
      if (columnDef.name === 'updated_at') column.defaultTo(knex.fn.now());
      if (
        columnDef.name === 'id' &&
        columnDef.type === 'uuid' &&
        !['Client_SQLite3', 'Client_BetterSQLite3', 'Client_Libsql'].includes(
          knex.client.constructor.name
        )
      )
        column.defaultTo(knex.fn.uuid());
    } catch (error) {
      console.log(error);
    }
  }

  // Apply modifiers
  if (columnDef.primary) column.primary();
  if (columnDef.unique) column.unique();
  // console.log("Nullable", columnDef.nullable);
  if (columnDef.nullable === false) column.notNullable();
  if (columnDef.default !== undefined) column.defaultTo(columnDef.default);

  // Foregn key
  if (columnDef.foreignKeys) {
    table
      .foreign(columnDef.foreignKeys.columnName)
      .references(`${columnDef.foreignKeys.references.columnName}`)
      .inTable(`${columnDef.foreignKeys.references.tableName}`);
  }

  return column;
}

// Helper function to check for foreign keys
async function dropExistingForeignKeys(
  knex: Knex,
  tableName: string,
  columnName: string,
  trx?: Knex.Transaction
) {
  const inspector = SchemaInspector(knex);
  // Get foreign key constraints
  const foreignKeys = await inspector.foreignKeys(tableName);

  for (const fk of foreignKeys) {
    if (fk.column === columnName) {
      // Use transaction if provided, otherwise use the knex instance
      const schemaBuilder = trx ? trx.schema : knex.schema;
      await schemaBuilder.alterTable(tableName, (table) => {
        table.dropForeign(fk.column);
      });
    }
  }
}

// Update column function using drop and recreate approach
export async function updateColumn(
  knex: Knex,
  tableName: string,
  columnDef: UpdateColumnDefinition,
  trx?: Knex.Transaction
) {
  // First, check and drop any existing foreign keys
  await dropExistingForeignKeys(knex, tableName, columnDef.currentName, trx);

  // Then do all modifications in a single alter table call
  // Use transaction if provided, otherwise use the knex instance
  const schemaBuilder = trx ? trx.schema : knex.schema;
  await schemaBuilder.alterTable(tableName, (table) => {
    // Drop the existing column
    table.dropColumn(columnDef.currentName);

    // Recreate the column with new definition
    const column = createColumn(
      table,
      {
        name: columnDef.newName || columnDef.currentName,
        type: columnDef.type || columnDef.currentType,
        nullable: columnDef.nullable ?? true,
        primary: columnDef.primary,
        unique: columnDef.unique,
        foreignKeys: columnDef.foreignKeys,
        default: columnDef.default,
      },
      knex
    );

    return column;
  });
}
