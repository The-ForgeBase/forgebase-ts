import { Kysely, sql } from 'kysely';

import type { DatabaseAdapter } from '../adapters/base';
import { getAdapter } from '../adapters/index';

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

export class KyselyQueryHandler {
  private adapter: DatabaseAdapter;

  constructor(private db: Kysely<any>) {
    this.adapter = getAdapter(db);
  }

  buildQuery(params: QueryParams, query: any) {
    // Add select handling at the start of query building
    // Only apply select/selectAll for SELECT queries (not UPDATE/DELETE builders)
    if (typeof query.selectAll === 'function') {
      const selections: any[] = [];

      // 1. Handle explicit selects
      if (params.select?.length) {
        // first remove the * if it's present, since explicit fields should override it
        const filteredSelects = params.select.filter((s) => s !== '*');
        if (filteredSelects.length > 0) {
          selections.push(...filteredSelects);
        }
      }
      // 2. Handle GroupBy fields (auto-select if not explicitly selected)
      else if (params.groupBy?.length) {
        selections.push(...params.groupBy);
      }

      // 3. Handle Aggregates
      if (params.aggregates?.length) {
        params.aggregates.forEach((agg) => {
          // Construct aggregate: type(field) as alias
          // e.g. count(id) as total_count
          let aggExpr: any;

          if (agg.type === 'count') {
            // count(field) or count(*)
            aggExpr = this.db.fn.count(agg.field);
          } else if (agg.type === 'sum') {
            aggExpr = this.db.fn.sum(agg.field);
          } else if (agg.type === 'avg') {
            aggExpr = this.db.fn.avg(agg.field);
          } else if (agg.type === 'min') {
            aggExpr = this.db.fn.min(agg.field);
          } else if (agg.type === 'max') {
            aggExpr = this.db.fn.max(agg.field);
          }

          if (aggExpr) {
            if (agg.alias) {
              aggExpr = aggExpr.as(agg.alias);
            }
            selections.push(aggExpr);
          }
        });
      }

      // 4. Handle Window Functions
      if (params.windowFunctions?.length) {
        params.windowFunctions.forEach((wf) => {
          selections.push(sql.raw(this.adapter.buildWindowFunction(wf)));
        });
      }

      // Apply selections
      if (selections.length > 0) {
        query = query.select(selections);
      } else {
        // Default to selectAll if no specific selections
        query = query.selectAll();
      }
    }

    // Handle Window Functions
    if (params.windowFunctions?.length) {
      const windowSelections = params.windowFunctions.map((wf) =>
        sql.raw(this.adapter.buildWindowFunction(wf)),
      );
      query = query.select(windowSelections);
    }

    // 1. CTEs and Window Functions (must come first)
    // Handle CTEs first
    // TODO: This is not working yet - query.with is not a function
    if (params.ctes?.length) {
      params.ctes.forEach((cte) => {
        // Assuming cte.query.params describes the subquery
        // We need a base query to build upon for the CTE.
        // Likely we need to start a new query builder for the CTE.
        // For now, we assume simple recursive calls are supported if `query` structure allows `with`.
        // query.with(name, cb)
        query = query.with(cte.name, (qb: any) =>
          this.buildQuery(cte.query.params, qb),
        );
      });
    }

    // Apply basic filters
    if (params.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        query = query.where(key, '=', value);
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
        query = query.where((eb: any) =>
          eb(clause.field, '>=', clause.value[0]).and(
            clause.field,
            '<=',
            clause.value[1],
          ),
        );
      });
    }

    // Apply where null/not null
    if (params.whereNull) {
      params.whereNull.forEach((field) => {
        query = query.where(field, 'is', null);
      });
    }

    if (params.whereNotNull) {
      params.whereNotNull.forEach((field) => {
        query = query.where(field, 'is not', null);
      });
    }

    // Apply where in/not in
    if (params.whereIn) {
      Object.entries(params.whereIn).forEach(([field, values]) => {
        query = query.where(field, 'in', values);
      });
    }

    if (params.whereNotIn) {
      Object.entries(params.whereNotIn).forEach(([field, values]) => {
        query = query.where(field, 'not in', values);
      });
    }

    // Apply grouped where clauses
    if (params.whereGroups) {
      params.whereGroups.forEach((group) => {
        if (group.type === 'AND') {
          query = query.where((eb: any) => {
            let expr = eb.and([]);
            group.clauses.forEach((clause: any) => {
              if (clause.type) {
                // Nested group - simplifying for now, would need recursion
              } else {
                expr = expr.and(clause.field, clause.operator, clause.value);
              }
            });
            return expr;
          });
        } else {
          query = query.where((eb: any) => {
            let expr = eb.or([]);
            group.clauses.forEach((clause: any) => {
              if (clause.type) {
                // Nested
              } else {
                expr = expr.or(clause.field, clause.operator, clause.value);
              }
            });
            return expr;
          });
        }
      });
    }

    // Apply where exists clauses
    // TODO: TypeError: query.whereExists is not a function
    // if (params.whereExists) {
    //   params.whereExists.forEach((subQueryConfig) => {
    //     query = query.whereExists((qb: any) => {
    //       const subQuery = this.buildQuery(subQueryConfig.params, qb);
    //       if (subQueryConfig.joinCondition) {
    //         subQuery.where(
    //           subQueryConfig.joinCondition.leftField,
    //           subQueryConfig.joinCondition.operator,
    //           sql.ref(subQueryConfig.joinCondition.rightField),
    //         );
    //       }
    //       return subQuery;
    //     });
    //   });
    // }

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

    // Apply sorting
    if (params.orderBy) {
      params.orderBy.forEach((clause) => {
        query = query.orderBy(clause.field, clause.direction || 'asc');
      });
    }

    // Apply pagination
    if (params.limit) {
      query = query.limit(params.limit);
    }

    if (params.offset) {
      query = query.offset(params.offset);
    }

    return query;
  }
}
