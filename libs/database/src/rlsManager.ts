import type { PermissionRule, UserContext, UserContextFields } from './types';
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
  rows: Row | Row[],
  userContext: UserContext,
  permissionService: PermissionService
): Promise<Row | Row[]> {
  const tablePermissions = await permissionService.getPermissionsForTable(
    tableName
  );

  if (!tablePermissions) {
    throw new Error(`Permission for Table "${tableName}" not found`);
  }

  if (!tablePermissions?.operations?.[operation]) {
    throw new Error(
      `Operation "${operation}" not allowed on table "${tableName}"`
    );
  }

  const rules = tablePermissions.operations[operation];

  // if rules are empty, allow access
  if (!rules || rules.length === 0) {
    return rows;
  }

  // if the rules does not include a fieldCheck, just evaluate the rules against the userContext
  if (!rules.some((rule: PermissionRule) => rule.allow === 'fieldCheck')) {
    const access = evaluatePermission(rules, userContext, {});
    if (!access) {
      throw new Error(
        `User does not have permission to perform operation "${operation}" on table "${tableName}"`
      );
    }
    return rows;
  }

  if (Array.isArray(rows)) {
    const result: Row[] = [];
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const filteredChunk = chunk.filter((row) =>
        evaluatePermission(rules, userContext, row)
      );
      result.push(...filteredChunk);
    }
    return result;
  }

  const access = evaluatePermission(rules, userContext, rows);
  if (!access) {
    throw new Error(
      `User does not have permission to perform operation "${operation}" on table "${tableName}"`
    );
  }
  return rows;
}
