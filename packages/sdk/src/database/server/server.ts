/* eslint-disable @typescript-eslint/no-explicit-any */
import type knex from "knex";
import {
  DatabaseAdapter,
  DatabaseFeature,
  getAdapter,
} from "@the-forgebase/database";

// types.ts
type WhereOperator =
  | "="
  | "!="
  | ">"
  | ">="
  | "<"
  | "<="
  | "like"
  | "in"
  | "not in"
  | "between"
  | "is null"
  | "is not null";

interface WhereClause {
  field: string;
  operator: WhereOperator;
  value: any;
  boolean?: GroupOperator;
}

interface WhereBetweenClause {
  field: string;
  operator: "between";
  value: [any, any];
  boolean?: GroupOperator;
}

interface OrderByClause {
  field: string;
  direction?: "asc" | "desc";
  nulls?: "first" | "last";
}

interface WindowFunction {
  type:
    | "row_number"
    | "rank"
    | "dense_rank"
    | "lag"
    | "lead"
    | "first_value"
    | "last_value"
    | "sum"
    | "avg"
    | "count"
    | "min"
    | "max"
    | "nth_value"
    | "ntile";
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
  type: "count" | "sum" | "avg" | "min" | "max";
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

type GroupOperator = "AND" | "OR";

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
      type: "ROWS" | "RANGE";
      start: "UNBOUNDED PRECEDING" | "CURRENT ROW" | number;
      end?: "UNBOUNDED FOLLOWING" | "CURRENT ROW" | number;
    };
  };
  filter?: WhereClause[];
}

interface QueryParams {
  filter?: Record<string, any>;
  whereRaw?: WhereClause[];
  whereBetween?: WhereBetweenClause[];
  whereNull?: string[];
  whereNotNull?: string[];
  whereIn?: Record<string, any[]>;
  whereNotIn?: Record<string, any[]>;
  whereExists?: SubQueryConfig[];
  whereGroups?: Array<{ type: "AND" | "OR"; clauses: WhereClause[] }>;
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
      for (const cte of params.ctes) {
        query = query.with(cte.name, (qb: knex.Knex.QueryBuilder) =>
          this.buildQuery(cte.query.params, qb),
        );
      }
    }

    // Handle recursive CTEs
    if (params.recursiveCtes?.length) {
      for (const cte of params.recursiveCtes) {
        query = query.withRecursive(cte.name, (qb) => {
          return qb.from(() => {
            const initial = this.knex(cte.initialQuery.tableName)
              .select("*")
              .where(cte.initialQuery.params.filter || {});

            const recursive = this.knex(cte.recursiveQuery.tableName)
              .select("*")
              .where(cte.recursiveQuery.params.filter || {});

            if (cte.unionAll) {
              return initial.unionAll(recursive);
            }
            return initial.union(recursive);
          });
        });
      }
    }

    // Apply regular window functions first
    if (
      params.windowFunctions &&
      this.adapter.supportsFeature(DatabaseFeature.WindowFunctions)
    ) {
      for (const wf of params.windowFunctions) {
        const windowClause = this.adapter.buildWindowFunction(wf);
        query = query.select(this.knex.raw(windowClause));
      }
    }

    // Apply enhanced window functions second
    if (
      params.advancedWindows &&
      this.adapter.supportsFeature(DatabaseFeature.WindowFunctions)
    ) {
      if (params.advancedWindows?.length) {
        for (const wf of params.advancedWindows) {
          const windowClause = this.adapter.buildWindowFunction(wf);
          query = query.select(this.knex.raw(windowClause));
        }
      }
    }

    // Apply basic filters
    if (params.filter) {
      query = query.where(params.filter);
    }

    // Raw expressions handling removed for security reasons

    // Handle aggregates
    if (params.aggregates?.length) {
      for (const { type, field, alias } of params.aggregates) {
        const column = alias || `${type}_${field}`;
        switch (type) {
          case "count":
            query = query.count(field as any, { as: column });
            break;
          case "sum":
            query = query.sum(field as any, { as: column });
            break;
          case "avg":
            query = query.avg(field as any, { as: column });
            break;
          case "min":
            query = query.min(field as any, { as: column });
            break;
          case "max":
            query = query.max(field as any, { as: column });
            break;
        }
      }
    }

    // Apply raw where clauses
    if (params.whereRaw) {
      for (const clause of params.whereRaw) {
        query = query.where(clause.field, clause.operator, clause.value);
      }
    }

    // Apply where between clauses
    if (params.whereBetween) {
      for (const clause of params.whereBetween) {
        query = query.whereBetween(clause.field, clause.value);
      }
    }

    // Apply where null/not null
    if (params.whereNull) {
      for (const field of params.whereNull) {
        query = query.whereNull(field);
      }
    }

    if (params.whereNotNull) {
      for (const field of params.whereNotNull) {
        query = query.whereNotNull(field);
      }
    }

    // Apply where in/not in
    if (params.whereIn) {
      for (const [field, values] of Object.entries(params.whereIn)) {
        query = query.whereIn(field, values);
      }
    }

    if (params.whereNotIn) {
      for (const [field, values] of Object.entries(params.whereNotIn)) {
        query = query.whereNotIn(field, values);
      }
    }

    // Apply where exists
    if (params.whereExists) {
      for (const subQueryConfig of params.whereExists) {
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
              // biome-ignore lint/complexity/useLiteralKeys: <explanation>
              this.knex.raw("??", [`${query["_single"].table}.${leftField}`]),
            );
          }

          return subQuery;
        });
      }
    }

    // Apply grouped where clauses
    if (params.whereGroups) {
      for (const group of params.whereGroups) {
        query = query.where(function (this: any) {
          for (const clause of group.clauses) {
            const method =
              clause.boolean?.toLowerCase() === "or" ? "orWhere" : "where";
            this[method](clause.field, clause.operator, clause.value);
          }
        });
      }
    }

    // Apply group by
    if (params.groupBy) {
      query = query.groupBy(params.groupBy);
    }

    // Apply having
    if (params.having) {
      for (const clause of params.having) {
        query = query.having(clause.field, clause.operator, clause.value);
      }
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

    return query;
  }
}
