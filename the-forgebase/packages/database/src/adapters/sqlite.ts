import type { Knex } from 'knex';
import { type DatabaseAdapter, DatabaseFeature } from './base';
import { WindowFunction, OrderByClause } from '../sdk/server';

export class SQLiteAdapter implements DatabaseAdapter {
  buildWindowFunction(wf: WindowFunction): string {
    // SQLite specific window function syntax
    const fnCall =
      wf.type === 'row_number'
        ? 'ROW_NUMBER()'
        : `${wf.type}(${wf.field || '*'})`;

    let overClause = 'OVER (';
    if (wf.partitionBy?.length) {
      overClause += `PARTITION BY ${wf.partitionBy.join(',')}`;
    }
    if (wf.orderBy?.length) {
      overClause += ` ORDER BY ${wf.orderBy
        .map((ob) => `${ob.field} ${ob.direction || 'ASC'}`)
        .join(',')}`;
    }
    overClause += ')';

    return `${fnCall} ${overClause} AS ${wf.alias}`;
  }

  buildOrderByClause(
    clauses: OrderByClause[],
    knex: Knex
  ): { column: string; order: 'asc' | 'desc'; null?: 'first' | 'last' }[] {
    // SQLite doesn't support NULLS FIRST/LAST directly, use CASE statement
    // return clauses.map(({ field, direction, nulls }) => ({
    //   column: nulls
    //     ? knex.raw(
    //         `CASE WHEN ?? IS NULL THEN ${nulls === "first" ? 0 : 1} ELSE ${
    //           nulls === "first" ? 1 : 0
    //         } END, ??`,
    //         [field, field]
    //       )
    //     : field,
    //   order: direction || "asc",
    // }));
    return clauses.map(({ field, direction, nulls }) => ({
      column: field,
      order: direction || 'asc',
      nulls: nulls,
    }));
  }

  supportsFeature(feature: DatabaseFeature): boolean {
    const supported = {
      [DatabaseFeature.WindowFunctions]: true, // Only in SQLite 3.25.0+
      [DatabaseFeature.CTEs]: true,
      [DatabaseFeature.RecursiveCTEs]: true,
      [DatabaseFeature.NullsOrdering]: false,
      [DatabaseFeature.JsonOperations]: false,
      [DatabaseFeature.ArrayOperations]: false,
    };
    return supported[feature] || false;
  }

  sanitizeIdentifier(identifier: string): string {
    // SQLite identifier sanitization
    return `"${identifier.replace(/"/g, '""')}"`;
  }
}
