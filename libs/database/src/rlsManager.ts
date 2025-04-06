import type {
  PermissionRule,
  TablePermissions,
  UserContext,
  UserContextFields,
} from './types';
import { PermissionService } from './permissionService';
import type { Knex } from 'knex';
import { rlsFunctionRegistry } from './rlsFunctionRegistry';

export async function evaluatePermission(
  rules: PermissionRule[],
  userContext: UserContext,
  row: Record<string, unknown> = {},
  knex?: Knex
): Promise<boolean> {
  for (const rule of rules) {
    switch (rule.allow) {
      case 'public':
        return true;

      case 'private':
        return false;

      case 'role':
        if (!rule.roles || rule.roles.length === 0) {
          return false;
        }
        if (
          rule.roles &&
          userContext.role &&
          rule.roles?.includes(userContext.role)
        ) {
          return true;
        }
        return false;

      case 'auth':
        if (userContext.userId) {
          return true;
        }
        break;

      case 'guest':
        if (!userContext.userId) return true;
        break;

      case 'labels':
        if (
          rule.labels !== undefined &&
          userContext.labels.some(
            (label) => rule.labels && rule.labels.includes(label)
          )
        ) {
          return true;
        }
        break;

      case 'teams':
        if (
          rule.teams !== undefined &&
          userContext.teams.some(
            (team) => rule.teams && rule.teams.includes(team)
          )
        ) {
          return true;
        }
        break;

      case 'static':
        if (typeof rule.static === 'boolean') {
          return rule.static;
        }
        break;

      case 'fieldCheck':
        if (rule.fieldCheck) {
          const { field, operator, valueType, value } = rule.fieldCheck;
          const dataValue = row[field];
          console.log('Data value:', dataValue);
          const comparisonValue =
            valueType === 'userContext'
              ? userContext[value as UserContextFields]
              : value;

          switch (operator) {
            case '===':
              if (dataValue === comparisonValue) return true;
              break;
            case '!==':
              if (dataValue !== comparisonValue) return true;
              break;
            case 'in':
              if (
                Array.isArray(comparisonValue) &&
                comparisonValue.includes(dataValue)
              ) {
                return true;
              }
              break;
            case 'notIn':
              if (
                Array.isArray(comparisonValue) &&
                !comparisonValue.includes(dataValue)
              ) {
                return true;
              }
              break;
          }
        }
        break;

      case 'customSql':
        if (rule.customSql && knex) {
          try {
            // Replace placeholders with userContext values
            const parsedSql = rule.customSql.replace(
              /:([a-zA-Z_]+)/g,
              (_match, key: string): string => {
                if (userContext[key as UserContextFields] === undefined) {
                  throw new Error(`Missing context value for key: ${key}`);
                }
                // For SQL parameters, we need to handle different types appropriately
                const value = userContext[key as UserContextFields];
                if (typeof value === 'string') {
                  return `'${value.replace(/'/g, "''")}'`; // Escape single quotes for SQL
                } else if (value === null) {
                  return 'NULL';
                } else if (Array.isArray(value)) {
                  // Convert array to SQL array format
                  return `(${value
                    .map((item) => {
                      if (typeof item === 'string')
                        return `'${item.replace(/'/g, "''")}'`;
                      return item;
                    })
                    .join(', ')})`;
                }
                return String(value);
              }
            );

            console.log(`Executing custom SQL: ${parsedSql}`);

            // Execute the SQL query
            const result = await knex.raw(parsedSql);

            // Check if the query returned any rows or a truthy value
            if (Array.isArray(result)) {
              // For most database drivers, result is an array
              return result.length > 0 && result[0].length > 0;
            } else if (result && typeof result === 'object') {
              // For some drivers, result might be an object with rows property
              const rows = result.rows || result;
              return Array.isArray(rows) ? rows.length > 0 : !!rows;
            }

            // Default to false if we couldn't determine the result
            return false;
          } catch (error) {
            console.error(`Error executing custom SQL:`, error);
            return false;
          }
        }
        break;

      case 'customFunction':
        if (rule.customFunction) {
          try {
            // Get the function from the registry
            const customFn = rlsFunctionRegistry.get(rule.customFunction);
            if (!customFn) {
              console.error(
                `Custom RLS function "${rule.customFunction}" not found in registry`
              );
              return false;
            }

            // Execute the custom function with userContext and row data
            const result = await Promise.resolve(
              customFn(userContext, row, knex)
            );
            return !!result;
          } catch (error) {
            console.error(
              `Error executing custom RLS function "${rule.customFunction}":`,
              error
            );
            return false;
          }
        }
        break;
    }
  }
  return false;
}

const CHUNK_SIZE = 1000;

type Row = Record<string, unknown>;

export async function enforcePermissions(
  tableName: string,
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
  userContext: UserContext,
  permissionService: PermissionService,
  rows?: Row | Row[],
  knex?: Knex
): Promise<{
  row?: Row | Row[];
  status: boolean;
  message?: string;
  hasFieldCheck: boolean;
  hasCustomFunction: boolean;
}> {
  const tablePermissions = (await permissionService.getPermissionsForTable(
    tableName
  )) as TablePermissions;

  if (!tablePermissions) {
    return {
      row: rows,
      status: false,
      message: `No permissions defined for table "${tableName}"`,
      hasFieldCheck: false,
      hasCustomFunction: false,
    };
  }

  if (!tablePermissions?.operations?.[operation]) {
    return {
      row: rows,
      status: false,
      message: `No permissions defined for operation "${operation}" on table "${tableName}"`,
      hasFieldCheck: false,
      hasCustomFunction: false,
    };
  }

  const rules = tablePermissions.operations[operation];

  // Early return if no rules
  if (!rules || rules.length === 0) {
    return {
      row: rows,
      status: true,
      hasFieldCheck: false,
      hasCustomFunction: false,
    };
  }

  // Separate rules into different types
  const fieldCheckRules = rules.filter((rule) => rule.allow === 'fieldCheck');
  const customFunctionRules = rules.filter(
    (rule) => rule.allow === 'customFunction'
  );
  const simpleRules = rules.filter(
    (rule) => rule.allow !== 'fieldCheck' && rule.allow !== 'customFunction'
  );

  // First check simple rules that don't need row data
  if (simpleRules.length > 0) {
    // Check each rule and find the first one that grants access
    for (const rule of simpleRules) {
      const hasAccess = await evaluatePermission([rule], userContext, {}, knex);
      if (hasAccess) {
        return {
          row: rows,
          status: true,
          hasFieldCheck: false,
          hasCustomFunction: false,
        };
      }
    }
  }

  // Check customFunction rules if no simple rules matched
  // These need row data like fieldCheck rules
  if (customFunctionRules.length > 0) {
    // If no rows provided but we need to check with custom functions, return early
    if (!rows) {
      return {
        row: undefined,
        status: false,
        hasFieldCheck: false,
        hasCustomFunction: true,
        message: 'Custom function check required, please provide row data',
      };
    }

    // Handle array of rows
    if (Array.isArray(rows)) {
      const result: Row[] = [];
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        // Filter rows based on custom function rules
        const filteredChunk = [];
        for (const row of chunk) {
          // Check each row against all custom function rules
          for (const rule of customFunctionRules) {
            const hasAccess = await evaluatePermission(
              [rule],
              userContext,
              row,
              knex
            );
            if (hasAccess) {
              filteredChunk.push(row);
              break; // Move to the next row once we find a rule that grants access
            }
          }
        }
        result.push(...filteredChunk);
      }

      // If any rows passed the custom function checks, return success
      if (result.length > 0) {
        return {
          row: result,
          status: true,
          hasFieldCheck: false,
          hasCustomFunction: false,
        };
      }
    } else {
      // Handle single row
      for (const rule of customFunctionRules) {
        const hasAccess = await evaluatePermission(
          [rule],
          userContext,
          rows,
          knex
        );
        if (hasAccess) {
          return {
            row: rows,
            status: true,
            hasFieldCheck: false,
            hasCustomFunction: false,
          };
        }
      }
    }
  }

  // If we reach here, no non-fieldCheck rules passed
  // Check if we have fieldCheck rules
  if (fieldCheckRules.length > 0) {
    // If no rows provided but we need to check fields, return early
    if (!rows) {
      return {
        row: undefined,
        status: false,
        hasFieldCheck: true,
        hasCustomFunction: false,
        message: 'Field-level check required, please provide row data',
      };
    }

    // Handle array of rows
    if (Array.isArray(rows)) {
      const result: Row[] = [];
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        // Filter rows based on field check rules
        const filteredChunk = [];
        for (const row of chunk) {
          // Check each row against all field check rules
          for (const rule of fieldCheckRules) {
            const hasAccess = await evaluatePermission(
              [rule],
              userContext,
              row,
              knex
            );
            if (hasAccess) {
              filteredChunk.push(row);
              break; // Move to the next row once we find a rule that grants access
            }
          }
        }
        result.push(...filteredChunk);
      }
      return {
        row: result,
        status: result.length > 0,
        hasFieldCheck: false,
        hasCustomFunction: false,
        message:
          result.length === 0
            ? 'No rows matched the field-level permission rules'
            : undefined,
      };
    }

    // Handle single row
    let hasFieldAccess = false;
    for (const rule of fieldCheckRules) {
      hasFieldAccess = await evaluatePermission(
        [rule],
        userContext,
        rows,
        knex
      );
      if (hasFieldAccess) break;
    }

    return {
      row: rows,
      status: hasFieldAccess,
      hasFieldCheck: false,
      hasCustomFunction: false,
      message: !hasFieldAccess
        ? `User does not have field-level permission to perform operation "${operation}" on table "${tableName}"`
        : undefined,
    };
  }

  // If we reach here, no rules passed
  return {
    row: rows,
    status: false,
    hasFieldCheck: false,
    hasCustomFunction: false,
    message: `User does not have permission to perform operation "${operation}" on table "${tableName}"`,
  };
}
