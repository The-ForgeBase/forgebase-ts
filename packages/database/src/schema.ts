import type { Knex } from "knex";
import type {
  AddForeignKeyParams,
  DropForeignKeyParams,
  ModifySchemaParams,
  UpdateColumnDefinition,
} from "./types";
import { createColumn, updateColumn } from "./utils/column-utils";

// export async function createTable(knex: Knex, params: SchemaCreateParams) {
//   const { tableName, action, columns } = params;

//   if(action !== 'create') {
//     throw new Error('Not a create action')
//   }
// }

export async function addForeignKey(params: AddForeignKeyParams, knex: Knex) {
  const { tableName, column, foreignTableName, foreignColumn } = params;
  try {
    await knex.schema.table(tableName, (table) => {
      table.foreign(column).references(foreignColumn).inTable(foreignTableName);
    });

    return {
      message: "Foreign key added successfully",
    };
  } catch (error) {
    throw error;
  }
}

export async function dropForeignKey(params: DropForeignKeyParams, knex: Knex) {
  const { tableName, column } = params;
  try {
    await knex.schema.table(tableName, (table) => {
      table.dropForeign(column);
    });

    return {
      message: "Foreign key dropped successfully",
    };
  } catch (error) {
    throw error;
  }
}

export async function modifySchema(knex: Knex, params: ModifySchemaParams) {
  const { tableName, action, columns } = params;

  try {
    switch (action) {
      case "addColumn":
        await knex.schema.alterTable(tableName, (table) => {
          columns.forEach((col: any) => createColumn(table, col, knex));
        });
        return {
          message: "Columns added successfully",
        };

      case "deleteColumn":
        await knex.schema.alterTable(tableName, (table) => {
          columns.forEach((col: any) => table.dropColumn(col.name));
        });
        return {
          message: "Columns deleted successfully",
        };

      case "updateColumn":
        // Handle each column update sequentially
        for (const col of columns as UpdateColumnDefinition[]) {
          await updateColumn(knex, tableName, col);
        }

        return {
          message: "Columns updated successfully",
        };

      default:
        throw new Error("Invalid action");
    }
  } catch (error) {
    console.error("Error modifying schema:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

export async function truncateTable(tableName: string, knex: Knex) {
  try {
    await knex(tableName).truncate();

    return {
      message: "Table truncated",
    };
  } catch (error) {
    throw error;
  }
}
