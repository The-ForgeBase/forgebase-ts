import { Knex } from 'knex';
import { UserFieldDefinition } from './user-extension';

/**
 * Options for a migration operation
 */
export interface MigrationOptions {
  tableName?: string;
  transaction?: boolean;
}

/**
 * Options for adding columns to the user table
 */
export interface AddColumnsOptions extends MigrationOptions {
  fields: UserFieldDefinition[];
}

/**
 * Options for renaming a column in the user table
 */
export interface RenameColumnOptions extends MigrationOptions {
  oldName: string;
  newName: string;
}

/**
 * Options for modifying a column in the user table
 */
export interface ModifyColumnOptions extends MigrationOptions {
  field: UserFieldDefinition;
  oldName?: string; // If the column is being renamed
}

/**
 * Options for dropping columns from the user table
 */
export interface DropColumnsOptions extends MigrationOptions {
  columnNames: string[];
}

/**
 * Options for data migration
 */
export interface DataMigrationOptions extends MigrationOptions {
  transform: (row: Record<string, any>) => Record<string, any>;
  batchSize?: number;
}

/**
 * Adds columns to the user table
 * @param knex Knex instance
 * @param options Options for adding columns
 * @returns Promise that resolves when the operation is complete
 */
export async function addColumns(
  knex: Knex,
  options: AddColumnsOptions
): Promise<void> {
  const { fields, tableName = 'users', transaction = true } = options;

  const operation = async (trx: Knex.Transaction | Knex) => {
    // Check if table exists
    const tableExists = await trx.schema.hasTable(tableName);
    if (!tableExists) {
      throw new Error(`Table ${tableName} does not exist`);
    }

    // Get existing columns
    const existingColumns = await trx.table(tableName).columnInfo();
    const existingColumnNames = Object.keys(existingColumns);

    // Add new columns
    await trx.schema.alterTable(tableName, (table) => {
      for (const field of fields) {
        // Skip if column already exists
        if (existingColumnNames.includes(field.name)) {
          console.warn(`Column ${field.name} already exists in ${tableName}`);
          continue;
        }

        // Add column based on type
        let column;
        switch (field.type) {
          case 'string':
            column = table.string(field.name);
            break;
          case 'text':
            column = table.text(field.name);
            break;
          case 'integer':
            column = table.integer(field.name);
            break;
          case 'bigInteger':
            column = table.bigInteger(field.name);
            break;
          case 'boolean':
            column = table.boolean(field.name);
            break;
          case 'decimal':
            column = table.decimal(field.name);
            break;
          case 'float':
            column = table.float(field.name);
            break;
          case 'datetime':
            column = table.datetime(field.name);
            break;
          case 'date':
            column = table.date(field.name);
            break;
          case 'time':
            column = table.time(field.name);
            break;
          case 'timestamp':
            column = table.timestamp(field.name);
            break;
          case 'json':
            column = table.json(field.name);
            break;
          case 'jsonb':
            column = table.jsonb(field.name);
            break;
          case 'uuid':
            if (
              ['Client_SQLite3', 'Client_BetterSQLite3', 'Client_Libsql'].includes(
                trx.client.constructor.name
              )
            ) {
              column = table.string(field.name, 36);
            } else {
              column = table.uuid(field.name);
            }
            break;
          default:
            throw new Error(`Unsupported column type: ${field.type}`);
        }

        // Apply modifiers
        if (field.nullable === false) {
          column.notNullable();
        } else {
          column.nullable();
        }

        if (field.unique) {
          column.unique();
        }

        if (field.default !== undefined) {
          column.defaultTo(field.default);
        }
      }
    });

    // Update existing rows with default values
    const fieldsWithDefaults = fields.filter(
      (field) => field.default !== undefined && field.nullable === false
    );

    if (fieldsWithDefaults.length > 0) {
      const updateData = fieldsWithDefaults.reduce((acc, field) => {
        acc[field.name] = field.default;
        return acc;
      }, {} as Record<string, any>);

      await trx(tableName).update(updateData);
    }
  };

  if (transaction) {
    await knex.transaction((trx) => operation(trx));
  } else {
    await operation(knex);
  }
}

/**
 * Renames a column in the user table
 * @param knex Knex instance
 * @param options Options for renaming a column
 * @returns Promise that resolves when the operation is complete
 */
export async function renameColumn(
  knex: Knex,
  options: RenameColumnOptions
): Promise<void> {
  const { oldName, newName, tableName = 'users', transaction = true } = options;

  const operation = async (trx: Knex.Transaction | Knex) => {
    // Check if table exists
    const tableExists = await trx.schema.hasTable(tableName);
    if (!tableExists) {
      throw new Error(`Table ${tableName} does not exist`);
    }

    // Get existing columns
    const existingColumns = await trx.table(tableName).columnInfo();
    
    // Check if old column exists
    if (!Object.keys(existingColumns).includes(oldName)) {
      throw new Error(`Column ${oldName} does not exist in ${tableName}`);
    }
    
    // Check if new column name already exists
    if (Object.keys(existingColumns).includes(newName)) {
      throw new Error(`Column ${newName} already exists in ${tableName}`);
    }

    // Rename column
    await trx.schema.alterTable(tableName, (table) => {
      table.renameColumn(oldName, newName);
    });
  };

  if (transaction) {
    await knex.transaction((trx) => operation(trx));
  } else {
    await operation(knex);
  }
}

/**
 * Modifies a column in the user table
 * @param knex Knex instance
 * @param options Options for modifying a column
 * @returns Promise that resolves when the operation is complete
 */
export async function modifyColumn(
  knex: Knex,
  options: ModifyColumnOptions
): Promise<void> {
  const { field, oldName, tableName = 'users', transaction = true } = options;

  const operation = async (trx: Knex.Transaction | Knex) => {
    // Check if table exists
    const tableExists = await trx.schema.hasTable(tableName);
    if (!tableExists) {
      throw new Error(`Table ${tableName} does not exist`);
    }

    // Get existing columns
    const existingColumns = await trx.table(tableName).columnInfo();
    const columnToModify = oldName || field.name;
    
    // Check if column exists
    if (!Object.keys(existingColumns).includes(columnToModify)) {
      throw new Error(`Column ${columnToModify} does not exist in ${tableName}`);
    }

    // For SQLite, we need to recreate the table
    if (['Client_SQLite3', 'Client_BetterSQLite3', 'Client_Libsql'].includes(
      trx.client.constructor.name
    )) {
      // SQLite doesn't support altering columns directly
      // We need to create a new table, copy data, and drop the old table
      // This is a simplified approach and may not work for all cases
      throw new Error('Modifying columns in SQLite is not supported directly. Please use a migration with a new table.');
    } else {
      // For other databases, we can alter the column
      await trx.schema.alterTable(tableName, (table) => {
        // If renaming, we need to do that first
        if (oldName && oldName !== field.name) {
          table.renameColumn(oldName, field.name);
        }

        // Now modify the column
        let column;
        switch (field.type) {
          case 'string':
            column = table.string(field.name).alter();
            break;
          case 'text':
            column = table.text(field.name).alter();
            break;
          case 'integer':
            column = table.integer(field.name).alter();
            break;
          case 'bigInteger':
            column = table.bigInteger(field.name).alter();
            break;
          case 'boolean':
            column = table.boolean(field.name).alter();
            break;
          case 'decimal':
            column = table.decimal(field.name).alter();
            break;
          case 'float':
            column = table.float(field.name).alter();
            break;
          case 'datetime':
            column = table.datetime(field.name).alter();
            break;
          case 'date':
            column = table.date(field.name).alter();
            break;
          case 'time':
            column = table.time(field.name).alter();
            break;
          case 'timestamp':
            column = table.timestamp(field.name).alter();
            break;
          case 'json':
            column = table.json(field.name).alter();
            break;
          case 'jsonb':
            column = table.jsonb(field.name).alter();
            break;
          case 'uuid':
            column = table.uuid(field.name).alter();
            break;
          default:
            throw new Error(`Unsupported column type: ${field.type}`);
        }

        // Apply modifiers
        if (field.nullable === false) {
          column.notNullable();
        } else {
          column.nullable();
        }

        if (field.unique) {
          // Drop existing unique constraint if it exists
          try {
            table.dropUnique([field.name]);
          } catch (error) {
            // Ignore error if constraint doesn't exist
          }
          table.unique([field.name]);
        }

        if (field.default !== undefined) {
          column.defaultTo(field.default);
        }
      });
    }
  };

  if (transaction) {
    await knex.transaction((trx) => operation(trx));
  } else {
    await operation(knex);
  }
}

/**
 * Drops columns from the user table
 * @param knex Knex instance
 * @param options Options for dropping columns
 * @returns Promise that resolves when the operation is complete
 */
export async function dropColumns(
  knex: Knex,
  options: DropColumnsOptions
): Promise<void> {
  const { columnNames, tableName = 'users', transaction = true } = options;

  const operation = async (trx: Knex.Transaction | Knex) => {
    // Check if table exists
    const tableExists = await trx.schema.hasTable(tableName);
    if (!tableExists) {
      throw new Error(`Table ${tableName} does not exist`);
    }

    // Get existing columns
    const existingColumns = await trx.table(tableName).columnInfo();
    const existingColumnNames = Object.keys(existingColumns);

    // Drop columns
    await trx.schema.alterTable(tableName, (table) => {
      for (const columnName of columnNames) {
        // Skip if column doesn't exist
        if (!existingColumnNames.includes(columnName)) {
          console.warn(`Column ${columnName} does not exist in ${tableName}`);
          continue;
        }

        table.dropColumn(columnName);
      }
    });
  };

  if (transaction) {
    await knex.transaction((trx) => operation(trx));
  } else {
    await operation(knex);
  }
}

/**
 * Performs a data migration on the user table
 * @param knex Knex instance
 * @param options Options for data migration
 * @returns Promise that resolves when the operation is complete
 */
export async function migrateData(
  knex: Knex,
  options: DataMigrationOptions
): Promise<void> {
  const { transform, tableName = 'users', transaction = true, batchSize = 100 } = options;

  const operation = async (trx: Knex.Transaction | Knex) => {
    // Check if table exists
    const tableExists = await trx.schema.hasTable(tableName);
    if (!tableExists) {
      throw new Error(`Table ${tableName} does not exist`);
    }

    // Get total count
    const { count } = await trx(tableName)
      .count('* as count')
      .first() as { count: number };
    
    // Process in batches
    const totalBatches = Math.ceil(count / batchSize);
    
    for (let batch = 0; batch < totalBatches; batch++) {
      // Get batch of rows
      const rows = await trx(tableName)
        .select('*')
        .orderBy('id')
        .limit(batchSize)
        .offset(batch * batchSize);
      
      // Transform each row and update
      for (const row of rows) {
        const transformedData = transform(row);
        await trx(tableName)
          .where('id', row.id)
          .update(transformedData);
      }
    }
  };

  if (transaction) {
    await knex.transaction((trx) => operation(trx));
  } else {
    await operation(knex);
  }
}
