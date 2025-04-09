import type knex from 'knex';
import type { DatabaseAdapter } from '../adapters/base';
import { DatabaseFeature, getAdapter } from '../adapters/index';

type WhereOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'like'
  | 'in'
  | 'not in'
  | 'between'
  | 'is null'
  | 'is not null';

interface WhereClause {
  field: string;
  operator: WhereOperator;
  value: any;
  boolean?: GroupOperator;
}

interface WhereBetweenClause {
  field: string;
  operator: 'between';
  value: [any, any];
  boolean?: GroupOperator;
}

export interface OrderByClause {
  field: string;
  direction?: 'asc' | 'desc';
  nulls?: 'first' | 'last';
}

export interface WindowFunction {
  type:
    | 'row_number'
    | 'rank'
    | 'dense_rank'
    | 'lag'
    | 'lead'
    | 'first_value'
    | 'last_value'
    | 'sum'
    | 'avg'
    | 'count'
    | 'min'
    | 'max'
    | 'nth_value'
    | 'ntile';
  field?: string;
  alias: string;
  partitionBy?: string[];
  orderBy?: OrderByClause[];
  frameClause?: string;
}

interface CTE {
  name: string;
  query: any;
  columns?: string[];
}

interface RecursiveCTE extends CTE {
  isRecursive: true;
  initialQuery: any;
  recursiveQuery: any;
  unionAll?: boolean;
}

interface TransformConfig {
  groupBy?: string[];
  pivot?: {
    column: string;
    values: string[];
    aggregate: AggregateOptions;
  };
  flatten?: boolean;
  select?: string[];
  compute?: Record<string, (row: any) => any>;
}

interface AggregateOptions {
  type: 'count' | 'sum' | 'avg' | 'min' | 'max';
  field: string;
  alias?: string;
}

interface RawExpression {
  sql: string;
  bindings?: any[];
}

// Add SubQueryConfig interface for whereExists
interface SubQueryConfig {
  tableName: string;
  params: QueryParams;
  joinCondition?: {
    leftField: string;
    operator: WhereOperator;
    rightField: string;
  };
}

type GroupOperator = 'AND' | 'OR';

interface WhereGroup {
  type: GroupOperator;
  clauses: (WhereClause | WhereGroup)[];
}

interface HavingClause {
  field: string;
  operator: WhereOperator;
  value: any;
}

interface WindowFunctionAdvanced extends WindowFunction {
  over?: {
    partitionBy?: string[];
    orderBy?: OrderByClause[];
    frame?: {
      type: 'ROWS' | 'RANGE';
      start: 'UNBOUNDED PRECEDING' | 'CURRENT ROW' | number;
      end?: 'UNBOUNDED FOLLOWING' | 'CURRENT ROW' | number;
    };
  };
  filter?: WhereClause[];
}

export interface QueryParams {
  filter?: Record<string, any>;
  whereRaw?: WhereClause[];
  whereBetween?: WhereBetweenClause[];
  whereNull?: string[];
  whereNotNull?: string[];
  whereIn?: Record<string, any[]>;
  whereNotIn?: Record<string, any[]>;
  whereExists?: SubQueryConfig[];
  whereGroups?: Array<{ type: 'AND' | 'OR'; clauses: WhereClause[] }>;
  orderBy?: OrderByClause[];
  groupBy?: string[];
  having?: HavingClause[];
  aggregates?: AggregateOptions[];
  // rawExpressions removed for security reasons
  limit?: number;
  offset?: number;
  windowFunctions?: WindowFunction[];
  ctes?: CTE[];
  transforms?: TransformConfig;
  // explain?: ExplainOptions;
  recursiveCtes?: RecursiveCTE[];
  advancedWindows?: WindowFunctionAdvanced[];
  select?: string[];
}

// query-builder.ts
export class QueryHandler {
  private adapter: DatabaseAdapter;

  constructor(private knex: knex.Knex) {
    this.knex = knex;
    this.adapter = getAdapter(knex);
  }

  buildQuery(params: QueryParams, query: knex.Knex.QueryBuilder) {
    // Add select handling at the start of query building
    if (params.select?.length) {
      query = query.select(params.select);
    }

    // 1. CTEs and Window Functions (must come first)
    // Handle CTEs first
    if (params.ctes?.length) {
      params.ctes.forEach((cte) => {
        query = query.with(cte.name, (qb: knex.Knex.QueryBuilder) =>
          this.buildQuery(cte.query.params, qb)
        );
      });
    }

    // Handle recursive CTEs
    if (params.recursiveCtes?.length) {
      params.recursiveCtes.forEach((cte) => {
        query = query.withRecursive(cte.name, (qb) => {
          return qb.from(() => {
            const initial = this.knex(cte.initialQuery.tableName)
              .select('*')
              .where(cte.initialQuery.params.filter || {});

            const recursive = this.knex(cte.recursiveQuery.tableName)
              .select('*')
              .where(cte.recursiveQuery.params.filter || {});

            if (cte.unionAll) {
              return initial.unionAll(recursive);
            }
            return initial.union(recursive);
          });
        });
      });
    }

    // Apply regular window functions first
    if (
      params.windowFunctions &&
      this.adapter.supportsFeature(DatabaseFeature.WindowFunctions)
    ) {
      params.windowFunctions.forEach((wf) => {
        const windowClause = this.adapter.buildWindowFunction(wf);
        query = query.select(this.knex.raw(windowClause));
      });
    }

    // Apply enhanced window functions second
    if (
      params.advancedWindows &&
      this.adapter.supportsFeature(DatabaseFeature.WindowFunctions)
    ) {
      if (params.advancedWindows?.length) {
        params.advancedWindows.forEach((wf) => {
          const windowClause = this.adapter.buildWindowFunction(wf);
          query = query.select(this.knex.raw(windowClause));
        });
      }
    }

    // Apply basic filters
    if (params.filter) {
      query = query.where(params.filter);
    }

    // Raw expressions handling removed for security reasons

    // Handle aggregates
    if (params.aggregates?.length) {
      params.aggregates.forEach(({ type, field, alias }) => {
        const column = alias || `${type}_${field}`;
        switch (type) {
          case 'count':
            query = query.count(field as any, { as: column });
            break;
          case 'sum':
            query = query.sum(field as any, { as: column });
            break;
          case 'avg':
            query = query.avg(field as any, { as: column });
            break;
          case 'min':
            query = query.min(field as any, { as: column });
            break;
          case 'max':
            query = query.max(field as any, { as: column });
            break;
        }
      });
    }

    // Apply raw where clauses
    if (params.whereRaw) {
      params.whereRaw.forEach((clause) => {
        query = query.where(clause.field, clause.operator, clause.value);
      });
    }

    // Apply where between clauses
    if (params.whereBetween) {
      params.whereBetween.forEach((clause) => {
        query = query.whereBetween(clause.field, clause.value);
      });
    }

    // Apply where null/not null
    if (params.whereNull) {
      params.whereNull.forEach((field) => {
        query = query.whereNull(field);
      });
    }

    if (params.whereNotNull) {
      params.whereNotNull.forEach((field) => {
        query = query.whereNotNull(field);
      });
    }

    // Apply where in/not in
    if (params.whereIn) {
      Object.entries(params.whereIn).forEach(([field, values]) => {
        query = query.whereIn(field, values);
      });
    }

    if (params.whereNotIn) {
      Object.entries(params.whereNotIn).forEach(([field, values]) => {
        query = query.whereNotIn(field, values);
      });
    }

    // Apply where exists
    if (params.whereExists) {
      params.whereExists.forEach((subQueryConfig) => {
        query = query.whereExists((builder) => {
          // Create a new builder for the subquery
          const subQuery = this.knex(subQueryConfig.tableName);

          // Apply the subquery parameters
          this.buildQuery(subQueryConfig.params, subQuery);

          // If we have a join condition, add it to the subquery
          if (subQueryConfig.joinCondition) {
            const { leftField, operator, rightField } =
              subQueryConfig.joinCondition;
            // Use the parent table reference with knex.raw to create a proper correlated subquery
            subQuery.where(
              rightField,
              operator,
              this.knex.raw(`??`, [`${query['_single'].table}.${leftField}`])
            );
          }

          return subQuery;
        });
      });
    }

    // Apply grouped where clauses
    if (params.whereGroups) {
      params.whereGroups.forEach((group) => {
        query = query.where(function (this: any) {
          group.clauses.forEach((clause) => {
            const method =
              clause.boolean?.toLowerCase() === 'or' ? 'orWhere' : 'where';
            this[method](clause.field, clause.operator, clause.value);
          });
        });
      });
    }

    // Apply group by
    if (params.groupBy) {
      query = query.groupBy(params.groupBy);
    }

    // Apply having
    if (params.having) {
      params.having.forEach((clause) => {
        query = query.having(clause.field, clause.operator, clause.value);
      });
    }

    // Update order by handling with adapter
    if (params.orderBy) {
      const orderByClauses = this.adapter.buildOrderByClause(params.orderBy);
      query = query.orderBy(orderByClauses);
    }

    // Apply pagination
    if (params.limit) {
      query = query.limit(params.limit);
    }

    if (params.offset) {
      query = query.offset(params.offset);
    }

    // // Handle post-query transformations
    // if (params.transforms) {
    //   const transforms = params.transforms;
    //   query = query.then((results: any[]) => {
    //     let transformed = results;

    //     if (transforms.compute) {
    //       transformed = this.applyComputations(transformed, transforms.compute);
    //     }

    //     if (transforms.groupBy) {
    //       transformed = this.applyGrouping(transformed, transforms.groupBy);
    //     }

    //     if (transforms.pivot) {
    //       transformed = this.applyPivot(transformed, transforms.pivot);
    //     }

    //     return transformed;
    //   });
    // }

    return query;
  }

  // private buildWindowFunction(wf: any): string {
  //   let fnCall =
  //     wf.type === "row_number"
  //       ? "ROW_NUMBER()"
  //       : `${wf.type}(${wf.field || "*"})`;

  //   let overClause = "OVER (";
  //   if (wf.over?.partitionBy?.length) {
  //     overClause += `PARTITION BY ${wf.over.partitionBy.join(",")}`;
  //   }

  //   if (wf.over?.orderBy?.length) {
  //     overClause += ` ORDER BY ${wf.over.orderBy
  //       .map((ob: any) => `${ob.field} ${ob.direction || "ASC"}`)
  //       .join(",")}`;
  //   }

  //   if (wf.over?.frame) {
  //     overClause += ` ${wf.over.frame.type} BETWEEN ${
  //       wf.over.frame.start
  //     } AND ${wf.over.frame.end || "CURRENT ROW"}`;
  //   }

  //   overClause += ")";

  //   return `${fnCall} ${overClause} AS ${wf.alias}`;
  // }

  private applyComputations(
    results: any[],
    computations: Record<string, (row: any) => any>
  ): any[] {
    return results.map((row) => ({
      ...row,
      ...Object.entries(computations).reduce(
        (acc, [key, fn]) => ({
          ...acc,
          [key]: fn(row),
        }),
        {}
      ),
    }));
  }

  private applyGrouping(results: any[], groupBy: string[]): any[] {
    return Object.values(
      results.reduce((acc, row) => {
        const key = groupBy.map((field) => row[field]).join(':');
        if (!acc[key]) {
          acc[key] = { ...row, _count: 1 };
        } else {
          acc[key]._count++;
        }
        return acc;
      }, {} as Record<string, any>)
    );
  }

  private applyPivot(results: any[], pivot: TransformConfig['pivot']): any[] {
    if (!pivot) return results;

    const { column, values, aggregate } = pivot;
    return results.reduce((acc: any[], row: any) => {
      const existing = acc.find((r) =>
        Object.keys(r)
          .filter((k) => k !== column && k !== aggregate.field)
          .every((k) => r[k] === row[k])
      );

      if (existing) {
        existing[row[column]] = row[aggregate.field];
      } else {
        const newRow = { ...row };
        delete newRow[column];
        delete newRow[aggregate.field];
        newRow[row[column]] = row[aggregate.field];
        acc.push(newRow);
      }

      return acc;
    }, []);
  }
}
