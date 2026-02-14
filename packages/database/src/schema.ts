import {
  sql,
  type Kysely,
  type Transaction,
  type AlterTableBuilder,
  type AlterTableColumnAlteringBuilder,
} from 'kysely';
import type {
  AddForeignKeyParams,
  DropForeignKeyParams,
  ModifySchemaParams,
  UpdateColumnDefinition,
} from './types';
import { createColumn, updateColumn } from './utils/column-utils';

export async function addForeignKey(
  params: AddForeignKeyParams,
  db: Kysely<any>,
  trx?: Transaction<any>,
) {
  const { tableName, column, foreignTableName, foreignColumn } = params;

  const executor = trx || db;

  await executor.schema
    .alterTable(tableName)
    .addForeignKeyConstraint(
      `fk_${tableName}_${column}`,
      [column],
      foreignTableName,
      [foreignColumn],
    )
    .execute();

  return {
    message: 'Foreign key added successfully',
  };
}

export async function dropForeignKey(
  params: DropForeignKeyParams,
  db: Kysely<any>,
  trx?: Transaction<any>,
) {
  const { tableName, column } = params;

  const executor = trx || db;

  // Kysely drops constraint by name. We typically need the constraint name.
  // We can try to guess it if we used standard naming, or we just rely on user knowing "column" here implies we find the constraint for it?
  // The knex implementation dropped foreign key by *column name*.
  // Postgres: ALTER TABLE table DROP CONSTRAINT constraint_name
  // Kysely: dropConstraint(constraintName)
  // We might need to introspect to find the constraint name for this column if it's not provided or standard.
  // For now, assuming standard naming `fk_tableName_column` which we used in addForeignKey above

  const constraintName = `fk_${tableName}_${column}`;

  await executor.schema
    .alterTable(tableName)
    .dropConstraint(constraintName)
    .execute();

  return {
    message: 'Foreign key dropped successfully',
  };
}

export async function modifySchema(
  db: Kysely<any>,
  params: ModifySchemaParams,
  trx?: Transaction<any>,
) {
  const { tableName, action, columns } = params;

  try {
    const executor = trx || db;

    switch (action) {
      case 'addColumn':
        // Chain adds? Kysely alterTable builds one query.
        // We can execute multiple alter table statements or try to chain if supported.
        // `createColumn` now returns the builder.
        // We can chain:
        // let builder = executor.schema.alterTable(tableName);
        // columns.forEach(c => builder = createColumn(builder, c, db));
        // await builder.execute();

        // Wait, `createColumn` calls `builder.addColumn`. `addColumn` returns `AlterTableBuilder`.
        // So yes, chaining works.
        if (columns.length > 0) {
          let builder: AlterTableBuilder | AlterTableColumnAlteringBuilder =
            executor.schema.alterTable(tableName);
          columns.forEach((col: any) => {
            builder = createColumn(
              builder,
              col,
              db,
            ) as AlterTableColumnAlteringBuilder;
          });
          if ('execute' in builder) {
            await (
              builder as unknown as AlterTableColumnAlteringBuilder
            ).execute();
          }
        }

        return {
          message: 'Columns added successfully',
        };

      case 'deleteColumn':
        if (columns.length > 0) {
          let builder: AlterTableBuilder | AlterTableColumnAlteringBuilder =
            executor.schema.alterTable(tableName);
          columns.forEach((col: any) => {
            builder = builder.dropColumn(col.name);
          });
          if ('execute' in builder) {
            await (
              builder as unknown as AlterTableColumnAlteringBuilder
            ).execute();
          }
        }
        return {
          message: 'Columns deleted successfully',
        };

      case 'updateColumn':
        // Handle each column update sequentially
        for (const col of columns as UpdateColumnDefinition[]) {
          await updateColumn(db, tableName, col, trx);
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
  db: Kysely<any>,
  trx?: Transaction<any>,
) {
  const executor = trx || db;
  const adapter = db.getExecutor().adapter;
  const adapterName = adapter.constructor.name;

  if (adapterName.includes('Postgres')) {
    await sql`TRUNCATE TABLE ${sql.table(tableName)} CASCADE`.execute(executor);
  } else {
    await executor.deleteFrom(tableName).execute();

    // Optional: Try to reset sequence for SQLite
    if (adapterName.includes('Sqlite')) {
      try {
        await sql`DELETE FROM sqlite_sequence WHERE name = ${tableName}`.execute(
          executor,
        );
      } catch {
        // Ignore
      }
    }
  }

  return {
    message: 'Table truncated',
  };
}
