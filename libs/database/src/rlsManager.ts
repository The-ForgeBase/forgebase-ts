import type {
  PermissionRule,
  TablePermissions,
  UserContext,
  UserContextFields,
} from './types';
import { PermissionService } from './permissionService';

export function evaluatePermission(
  rules: PermissionRule[],
  userContext: UserContext,
  row: Record<string, any> = {}
): boolean {
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
          userContext.labels.some((label) => rule.labels!.includes(label))
        ) {
          return true;
        }
        break;

      case 'teams':
        if (
          rule.teams !== undefined &&
          userContext.teams.some((team) => rule.teams!.includes(team))
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
        if (rule.customSql) {
          const parsedSql = rule.customSql.replace(
            /:([a-zA-Z_]+)/g,
            (_, key) => {
              if (userContext[key as UserContextFields] === undefined) {
                throw new Error(`Missing context value for key: ${key}`);
              }
              return JSON.stringify(userContext[key as UserContextFields]);
            }
          );
          console.log(`Executing custom SQL: ${parsedSql}`);
          return true; // Simulate SQL execution
        }
        break;
    }
  }
  return false;
}

const CHUNK_SIZE = 1000;

type Row = Record<string, any>;

export async function enforcePermissions(
  tableName: string,
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
  userContext: UserContext,
  permissionService: PermissionService,
  rows?: Row | Row[]
): Promise<{
  row?: Row | Row[];
  status: boolean;
  message?: string;
  hasFieldCheck: boolean;
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
    };
  }

  if (!tablePermissions?.operations?.[operation]) {
    return {
      row: rows,
      status: false,
      message: `No permissions defined for operation "${operation}" on table "${tableName}"`,
      hasFieldCheck: false,
    };
  }

  const rules = tablePermissions.operations[operation];

  // Early return if no rules
  if (!rules || rules.length === 0) {
    return { row: rows, status: true, hasFieldCheck: false };
  }

  // Separate rules into fieldCheck and non-fieldCheck
  const fieldCheckRules = rules.filter((rule) => rule.allow === 'fieldCheck');
  const nonFieldCheckRules = rules.filter(
    (rule) => rule.allow !== 'fieldCheck'
  );

  // First check non-fieldCheck rules
  if (nonFieldCheckRules.length > 0) {
    const hasAccess = nonFieldCheckRules.some((rule) =>
      evaluatePermission([rule], userContext, {})
    );
    if (hasAccess) {
      return {
        row: rows,
        status: true,
        hasFieldCheck: false,
      };
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
        message: 'Field-level check required, please provide row data',
      };
    }

    // Handle array of rows
    if (Array.isArray(rows)) {
      const result: Row[] = [];
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const filteredChunk = chunk.filter((row) => {
          return fieldCheckRules.some((rule) =>
            evaluatePermission([rule], userContext, row)
          );
        });
        result.push(...filteredChunk);
      }
      return {
        row: result,
        status: result.length > 0,
        hasFieldCheck: false,
        message:
          result.length === 0
            ? 'No rows matched the field-level permission rules'
            : undefined,
      };
    }

    // Handle single row
    const hasFieldAccess = fieldCheckRules.some((rule) =>
      evaluatePermission([rule], userContext, rows)
    );

    return {
      row: rows,
      status: hasFieldAccess,
      hasFieldCheck: false,
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
    message: `User does not have permission to perform operation "${operation}" on table "${tableName}"`,
  };
}
