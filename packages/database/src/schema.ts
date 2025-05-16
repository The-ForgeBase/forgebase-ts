import type { Knex } from 'knex';
import type {
  AddForeignKeyParams,
  DropForeignKeyParams,
  ModifySchemaParams,
  UpdateColumnDefinition,
} from './types';
import { createColumn, updateColumn } from './utils/column-utils';

// export async function createTable(knex: Knex, params: SchemaCreateParams) {
//   const { tableName, action, columns } = params;

//   if(action !== 'create') {
//     throw new Error('Not a create action')
//   }
// }

export async function addForeignKey(
  params: AddForeignKeyParams,
  knex: Knex,
  trx?: Knex.Transaction
) {
  const { tableName, column, foreignTableName, foreignColumn } = params;

  // Use transaction if provided, otherwise use the knex instance
  const schemaBuilder = trx ? trx.schema : knex.schema;

  await schemaBuilder.table(tableName, (table) => {
    table.foreign(column).references(foreignColumn).inTable(foreignTableName);
  });

  return {
    message: 'Foreign key added successfully',
  };
}

export async function dropForeignKey(
  params: DropForeignKeyParams,
  knex: Knex,
  trx?: Knex.Transaction
) {
  const { tableName, column } = params;

  // Use transaction if provided, otherwise use the knex instance
  const schemaBuilder = trx ? trx.schema : knex.schema;

  await schemaBuilder.table(tableName, (table) => {
    table.dropForeign(column);
  });

  return {
    message: 'Foreign key dropped successfully',
  };
}

export async function modifySchema(
  knex: Knex,
  params: ModifySchemaParams,
  trx?: Knex.Transaction
) {
  const { tableName, action, columns } = params;

  try {
    // Use transaction if provided, otherwise use the knex instance
    const schemaBuilder = trx ? trx.schema : knex.schema;

    switch (action) {
      case 'addColumn':
        await schemaBuilder.alterTable(tableName, (table) => {
          columns.forEach((col: any) => createColumn(table, col, knex));
        });
        return {
          message: 'Columns added successfully',
        };

      case 'deleteColumn':
        await schemaBuilder.alterTable(tableName, (table) => {
          columns.forEach((col: any) => table.dropColumn(col.name));
        });
        return {
          message: 'Columns deleted successfully',
        };

      case 'updateColumn':
        // Handle each column update sequentially
        for (const col of columns as UpdateColumnDefinition[]) {
          await updateColumn(knex, tableName, col, trx);
        }

        return {
          message: 'Columns updated successfully',
        };

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error modifying schema:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

export async function truncateTable(
  tableName: string,
  knex: Knex,
  trx?: Knex.Transaction
) {
  // Use transaction if provided, otherwise use the knex instance
  const queryBuilder = trx ? trx(tableName) : knex(tableName);
  await queryBuilder.truncate();

  return {
    message: 'Table truncated',
  };
}
