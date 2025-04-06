/* eslint-disable no-useless-escape */
import { Knex } from 'knex';
import { ColumnType } from '@forgebase-ts/database';
import { User } from '../types';

/**
 * Definition for a custom user field
 */
export interface UserFieldDefinition {
  name: string;
  type: ColumnType;
  nullable?: boolean;
  unique?: boolean;
  default?: any;
  description?: string;
  validation?: UserFieldValidation;
}

/**
 * Validation rules for a user field
 */
export interface UserFieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp | string;
  isEmail?: boolean;
  isUrl?: boolean;
  isPhone?: boolean;
  min?: number;
  max?: number;
  custom?: (value: any) => boolean | Promise<boolean>;
  customMessage?: string;
}

/**
 * Options for extending the user table
 */
export interface ExtendUserTableOptions {
  tableName?: string;
  fields: UserFieldDefinition[];
  migrateExisting?: boolean;
}

/**
 * Extends the user table with custom fields
 * @param knex Knex instance
 * @param options Options for extending the user table
 * @returns Promise that resolves when the operation is complete
 */
export async function extendUserTable(
  knex: Knex,
  options: ExtendUserTableOptions
): Promise<void> {
  const tableName = options.tableName || 'users';
  const { fields, migrateExisting = true } = options;

  // Check if table exists
  const tableExists = await knex.schema.hasTable(tableName);
  if (!tableExists) {
    throw new Error(`Table ${tableName} does not exist`);
  }

  // Get existing columns
  const existingColumns = await knex.table(tableName).columnInfo();
  const existingColumnNames = Object.keys(existingColumns);

  // Add new columns
  await knex.schema.alterTable(tableName, (table) => {
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
            [
              'Client_SQLite3',
              'Client_BetterSQLite3',
              'Client_Libsql',
            ].includes(knex.client.constructor.name)
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

  // If migrateExisting is true, update existing rows with default values
  if (migrateExisting) {
    const fieldsWithDefaults = fields.filter(
      (field) => field.default !== undefined
    );

    if (fieldsWithDefaults.length > 0) {
      const updateData = fieldsWithDefaults.reduce((acc, field) => {
        acc[field.name] = field.default;
        return acc;
      }, {} as Record<string, any>);

      await knex(tableName).update(updateData);
    }
  }
}

/**
 * Validates user data against field definitions
 * @param userData User data to validate
 * @param fieldDefinitions Field definitions to validate against
 * @returns Validation result with errors if any
 */
export function validateUserData(
  userData: Partial<User>,
  fieldDefinitions: UserFieldDefinition[]
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const field of fieldDefinitions) {
    const value = userData[field.name as keyof typeof userData];
    const validation = field.validation;

    if (!validation) continue;

    // Check required
    if (validation.required && (value === undefined || value === null)) {
      errors[field.name] = `${field.name} is required`;
      continue;
    }

    // Skip validation if value is not provided and not required
    if (value === undefined || value === null) continue;

    // Validate string fields
    if (typeof value === 'string') {
      if (validation.minLength && value.length < validation.minLength) {
        errors[
          field.name
        ] = `${field.name} must be at least ${validation.minLength} characters`;
      }

      if (validation.maxLength && value.length > validation.maxLength) {
        errors[
          field.name
        ] = `${field.name} must be at most ${validation.maxLength} characters`;
      }

      if (validation.pattern) {
        const pattern =
          validation.pattern instanceof RegExp
            ? validation.pattern
            : new RegExp(validation.pattern);
        if (!pattern.test(value)) {
          errors[field.name] = `${field.name} has an invalid format`;
        }
      }

      if (validation.isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors[field.name] = `${field.name} must be a valid email address`;
      }

      if (
        validation.isUrl &&
        !/^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/.test(
          value
        )
      ) {
        errors[field.name] = `${field.name} must be a valid URL`;
      }

      if (
        validation.isPhone &&
        !/^\+?[1-9]\d{1,14}$/.test(value.replace(/\s+/g, ''))
      ) {
        errors[field.name] = `${field.name} must be a valid phone number`;
      }
    }

    // Validate number fields
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        errors[field.name] = `${field.name} must be at least ${validation.min}`;
      }

      if (validation.max !== undefined && value > validation.max) {
        errors[field.name] = `${field.name} must be at most ${validation.max}`;
      }
    }

    // Custom validation
    if (validation.custom) {
      try {
        const result = validation.custom(value);
        if (result instanceof Promise) {
          // For async validation, we'll need to handle this differently
          // This is a simplified approach
          result.catch(() => {
            errors[field.name] =
              validation.customMessage || `${field.name} is invalid`;
          });
        } else if (!result) {
          errors[field.name] =
            validation.customMessage || `${field.name} is invalid`;
        }
      } catch (error) {
        errors[field.name] =
          validation.customMessage || `${field.name} is invalid`;
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Generates TypeScript interface code for an extended user type
 * @param interfaceName Name of the interface
 * @param fields Custom field definitions
 * @returns TypeScript code as a string
 */
export function generateUserTypeInterface(
  interfaceName: string,
  fields: UserFieldDefinition[]
): string {
  const fieldDefinitions = fields
    .map((field) => {
      const nullable = field.nullable !== false ? '?' : '';
      let type: string;

      switch (field.type) {
        case 'string':
        case 'text':
          type = 'string';
          break;
        case 'integer':
        case 'bigInteger':
        case 'decimal':
        case 'float':
          type = 'number';
          break;
        case 'boolean':
          type = 'boolean';
          break;
        case 'datetime':
        case 'date':
        case 'time':
        case 'timestamp':
          type = 'Date';
          break;
        case 'json':
        case 'jsonb':
          type = 'Record<string, any>';
          break;
        case 'uuid':
          type = 'string';
          break;
        default:
          type = 'any';
      }

      const comment = field.description
        ? `  /** ${field.description} */\n`
        : '';
      return `${comment}  ${field.name}${nullable}: ${type};`;
    })
    .join('\n');

  return `import { User } from '@forgebase-ts/auth';

/**
 * Extended user interface with custom fields
 */
export interface ${interfaceName} extends User {
${fieldDefinitions}
}
`;
}
