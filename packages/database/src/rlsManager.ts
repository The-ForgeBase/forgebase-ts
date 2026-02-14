import type {
  PermissionRule,
  TablePermissions,
  UserContext,
  UserContextFields,
} from './types';
import { PermissionService } from './permissionService';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import { rlsFunctionRegistry } from './rlsFunctionRegistry';

export async function evaluatePermission(
  rules: PermissionRule[],
  userContext: UserContext,
  row: Record<string, unknown> = {},
  db?: Kysely<any>,
): Promise<boolean> {
  for (const rule of rules) {
    switch (rule.allow) {
      case 'public':
        return true;

      case 'private':
        return false;

      case 'role':
        if (!rule.roles || rule.roles.length === 0) {
          // If no roles specified, continue to next rule
          continue;
        }
        if (
          rule.roles &&
          userContext.role &&
          rule.roles?.includes(userContext.role)
        ) {
          return true;
        }
        // If we reach here, the role rule didn't match
        // Continue to the next rule instead of returning false
        continue;

      case 'auth':
        if (userContext.userId) {
          return true;
        }
        // If we reach here, the auth rule didn't match
        // Continue to the next rule instead of breaking
        continue;

      case 'guest':
        if (!userContext.userId) return true;
        // If we reach here, the guest rule didn't match
        // Continue to the next rule instead of breaking
        continue;

      case 'labels':
        if (
          rule.labels !== undefined &&
          userContext.labels.some(
            (label) => rule.labels && rule.labels.includes(label),
          )
        ) {
          return true;
        }
        // If we reach here, the labels rule didn't match
        // Continue to the next rule instead of breaking
        continue;

      case 'teams':
        if (
          rule.teams !== undefined &&
          userContext.teams.some(
            (team) => rule.teams && rule.teams.includes(team),
          )
        ) {
          return true;
        }
        // If we reach here, the teams rule didn't match
        // Continue to the next rule instead of breaking
        continue;

      case 'static':
        if (typeof rule.static === 'boolean') {
          return rule.static;
        }
        // If we reach here, the static rule didn't match
        // Continue to the next rule instead of breaking
        continue;

      case 'fieldCheck':
        if (rule.fieldCheck) {
          const { field, operator, valueType, value } = rule.fieldCheck;
          const dataValue = row[field];
          // console.log('Data value:', dataValue);
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
        // If we reach here, the fieldCheck rule didn't match
        // Continue to the next rule instead of breaking
        continue;

      case 'customSql':
        if (rule.customSql && db) {
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
              },
            );

            // console.log(`Executing custom SQL: ${parsedSql}`);

            // Execute the SQL query
            // Kysely sql.raw returns a builder, we need to execute it.
            const result = await sql.raw(parsedSql).execute(db);
            const rows = result.rows;

            // Check if the query returned any rows or a truthy value
            // Kysely result.rows is array of rows
            return rows.length > 0;
          } catch (error) {
            console.error(`Error executing custom SQL:`, error);
            return false;
          }
        }
        // If we reach here, the customSql rule didn't match
        // Continue to the next rule instead of breaking
        continue;

      case 'customFunction':
        if (rule.customFunction) {
          try {
            // Get the function from the registry
            const customFn = rlsFunctionRegistry.get(rule.customFunction);
            if (!customFn) {
              console.error(
                `Custom RLS function "${rule.customFunction}" not found in registry`,
              );
              return false;
            }

            // Execute the custom function with userContext and row data
            const result = await Promise.resolve(
              customFn(userContext, row, db),
            );

            return !!result;
          } catch (error) {
            console.error(
              `Error executing custom RLS function "${rule.customFunction}":`,
              error,
            );
            return false;
          }
        }
        // If we reach here, the customFunction rule didn't match
        // Continue to the next rule instead of breaking
        continue;
    }
  }
  return false;
}

/**
 * Fast path: evaluate pre-extracted fieldCheck rules against a single row.
 * Avoids the full enforcePermissions overhead (permission lookup, rule
 * classification, array handling) when we already know we need a fieldCheck
 * evaluation for one specific record.
 */
export async function evaluateFieldCheckForRow(
  fieldCheckRules: PermissionRule[],
  userContext: UserContext,
  row: Record<string, unknown>,
  db?: Kysely<any>,
): Promise<boolean> {
  for (const rule of fieldCheckRules) {
    if (await evaluatePermission([rule], userContext, row, db)) {
      return true;
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
  db?: Kysely<any>,
): Promise<{
  row?: Row | Row[];
  status: boolean;
  message?: string;
  hasFieldCheck: boolean;
  hasCustomFunction: boolean;
  fieldCheckRules?: PermissionRule[];
  customFunctionRules?: PermissionRule[];
}> {
  // Try sync cache lookup first to avoid async overhead on cache hits
  const tablePermissions = (permissionService.getPermissionsForTableSync(
    tableName,
  ) ??
    (await permissionService.getPermissionsForTable(
      tableName,
    ))) as TablePermissions;

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

  // Single-pass rule classification (avoids 3× Array.filter)
  const fieldCheckRules: PermissionRule[] = [];
  const customFunctionRules: PermissionRule[] = [];
  const simpleRules: PermissionRule[] = [];
  for (const rule of rules) {
    if (rule.allow === 'fieldCheck') fieldCheckRules.push(rule);
    else if (rule.allow === 'customFunction') customFunctionRules.push(rule);
    else simpleRules.push(rule);
  }

  // First check simple rules that don't need row data
  if (simpleRules.length > 0) {
    // Check each rule and find the first one that grants access
    for (const rule of simpleRules) {
      const hasAccess = await evaluatePermission([rule], userContext, {}, db);
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
        fieldCheckRules,
        customFunctionRules,
        message: 'Custom function check required, please provide row data',
      };
    }

    // Handle array of rows
    if (Array.isArray(rows)) {
      const result: Row[] = [];
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        // Filter rows based on custom function rules
        const filteredChunk: Row[] = [];
        for (const row of chunk) {
          // Check each row against all custom function rules
          for (const rule of customFunctionRules) {
            const hasAccess = await evaluatePermission(
              [rule],
              userContext,
              row,
              db,
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
          db,
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
        fieldCheckRules,
        customFunctionRules,
        message: 'Field-level check required, please provide row data',
      };
    }

    // Handle array of rows
    if (Array.isArray(rows)) {
      const result: Row[] = [];
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        // Filter rows based on field check rules
        const filteredChunk: Row[] = [];
        for (const row of chunk) {
          // Check each row against all field check rules
          for (const rule of fieldCheckRules) {
            const hasAccess = await evaluatePermission(
              [rule],
              userContext,
              row,
              db,
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
      hasFieldAccess = await evaluatePermission([rule], userContext, rows, db);
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
