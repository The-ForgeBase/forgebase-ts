/* eslint-disable @typescript-eslint/no-empty-object-type */
// hookableDb.ts
import EventEmitter from "node:events";
import type { Knex } from "knex";
import { RealtimeAdapter } from "./websocket/RealtimeAdapter";

type MutationType = "create" | "update" | "delete";

type QueryFunction<T extends {}> = (
  query: Knex.QueryBuilder<T, any>,
) => Promise<T[]>;

type MutationFunction<T extends {}> = (
  query: Knex.QueryBuilder<T, any>,
) => Promise<any>;

type HookContext = Record<string, any>;

type KnexHooksEvents = {
  beforeQuery: (payload: { tableName: string; context?: HookContext }) => void;
  afterQuery: (payload: {
    tableName: string;
    result: any;
    context?: HookContext;
  }) => void;
  beforeMutation: (payload: {
    tableName: string;
    mutationType: MutationType;
    data?: any;
    context?: HookContext;
  }) => void;
  afterMutation: (payload: {
    tableName: string;
    mutationType: MutationType;
    result: any;
    data?: any;
    context?: HookContext;
  }) => void;
};

class KnexHooks {
  private knex: Knex;
  private events: EventEmitter;
  private realtimeAdapter?: RealtimeAdapter;

  constructor(knexInstance: Knex, realtimeAdapter?: RealtimeAdapter) {
    if (!knexInstance) {
      throw new Error(
        "A Knex.js instance is required to initialize HookableDB.",
      );
    }
    this.knex = knexInstance;
    this.events = new EventEmitter();
    if (realtimeAdapter) {
      this.realtimeAdapter = realtimeAdapter;
    }
  }

  getKnexInstance(): Knex {
    return this.knex;
  }

  // Hookable query method
  async query<T extends {}>(
    tableName: string,
    queryFn: QueryFunction<T>,
    context?: HookContext,
    trx?: Knex.Transaction,
  ): Promise<T[]> {
    this.events.emit("beforeQuery", { tableName, context });
    await this.beforeQuery(tableName, context);

    // Use transaction if provided, otherwise use the knex instance
    const queryBuilder = trx ? trx<T>(tableName) : this.knex<T>(tableName);
    const result = await queryFn(queryBuilder);

    this.events.emit("afterQuery", { tableName, result, context });
    await this.afterQuery(tableName, result, context);
    return result;
  }

  // Hookable mutation method
  async mutate<T extends {}>(
    tableName: string,
    mutationType: MutationType,
    mutationFn: MutationFunction<T>,
    data?: any,
    context?: HookContext,
    trx?: Knex.Transaction,
  ): Promise<any> {
    this.events.emit("beforeMutation", {
      tableName,
      mutationType,
      data,
      context,
    });

    await this.beforeMutation(tableName, mutationType, data, context);

    // Use transaction if provided, otherwise use the knex instance
    const queryBuilder = trx ? trx<T>(tableName) : this.knex<T>(tableName);
    const result = await mutationFn(queryBuilder);

    // console.log('afterMutation', {
    //   tableName,
    //   mutationType,
    //   result,
    //   data,
    //   context,
    // });

    this.events.emit("afterMutation", {
      tableName,
      mutationType,
      result,
      data,
      context,
    });

    await this.afterMutation(tableName, mutationType, result, data, context);
    return result;
  }

  // Hook methods (can be overridden or extended)
  async beforeQuery(tableName: string, context?: HookContext): Promise<void> {
    // Example: Add custom runtime RLS here
  }

  async afterQuery(
    tableName: string,
    result: any,
    context?: HookContext,
  ): Promise<void> {
    // Example: Log fetched data
    // console.log(`[Query] Fetched from ${tableName}:`, result);
  }

  async beforeMutation(
    tableName: string,
    mutationType: MutationType,
    data?: any,
    context?: HookContext,
  ): Promise<void> {
    // Example: Enforce permissions here
    console.log(`[Before ${mutationType}] On ${tableName}:`, data);
  }

  async afterMutation(
    tableName: string,
    mutationType: MutationType,
    result: any,
    data?: any,
    context?: HookContext,
  ): Promise<void> {
    // Emit real-time events on mutations
    if (this.realtimeAdapter) {
      //TODO: Check if  real-time is allowed for the table
      this.realtimeAdapter.broadcast(tableName, mutationType, {
        type: mutationType,
        data: mutationType === "delete" ? data : result,
      });
    }
  }

  // Expose the EventEmitter for external listeners
  on<Event extends keyof KnexHooksEvents>(
    event: Event,
    listener: KnexHooksEvents[Event],
  ): void {
    this.events.on(event, listener);
  }

  off<Event extends keyof KnexHooksEvents>(
    event: Event,
    listener: KnexHooksEvents[Event],
  ): void {
    this.events.off(event, listener);
  }
}

export { KnexHooks };
