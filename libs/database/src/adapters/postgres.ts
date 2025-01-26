import { type DatabaseAdapter, DatabaseFeature } from "./base.js";
import type { WindowFunction, OrderByClause } from "../sdk/server.js";

export class PostgresAdapter implements DatabaseAdapter {
  buildWindowFunction(wf: WindowFunction): string {
    // PostgreSQL full window function support
    const fnCall =
      wf.type === "row_number"
        ? "ROW_NUMBER()"
        : `${wf.type}(${wf.field || "*"})`;

    let overClause = "OVER (";
    if (wf.partitionBy?.length) {
      overClause += `PARTITION BY ${wf.partitionBy.join(",")}`;
    }
    if (wf.orderBy?.length) {
      overClause += ` ORDER BY ${wf.orderBy
        .map((ob) => `${ob.field} ${ob.direction || "ASC"}`)
        .join(",")}`;
    }
    if (wf.frameClause) {
      overClause += ` ${wf.frameClause}`;
    }
    overClause += ")";

    return `${fnCall} ${overClause} AS ${wf.alias}`;
  }

  buildOrderByClause(
    clauses: OrderByClause[]
  ): { column: string; order: "asc" | "desc"; null?: "first" | "last" }[] {
    // PostgreSQL supports NULLS FIRST/LAST natively
    return clauses.map(({ field, direction, nulls }) => ({
      column: field,
      order: direction || "asc",
      nulls: nulls,
    }));
  }

  supportsFeature(feature: DatabaseFeature): boolean {
    const supported = {
      [DatabaseFeature.WindowFunctions]: true,
      [DatabaseFeature.CTEs]: true,
      [DatabaseFeature.RecursiveCTEs]: true,
      [DatabaseFeature.NullsOrdering]: true,
      [DatabaseFeature.JsonOperations]: true,
      [DatabaseFeature.ArrayOperations]: true,
    };
    return supported[feature] || false;
  }

  sanitizeIdentifier(identifier: string): string {
    // PostgreSQL identifier sanitization
    return `"${identifier.replace(/"/g, '""')}"`;
  }
}
