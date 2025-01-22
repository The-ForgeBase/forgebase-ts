// hookableDb.ts
import EventEmitter from "events";
import type { Knex } from "knex";

type MutationType = "create" | "update" | "delete";

type QueryFunction<T extends {}> = (
  query: Knex.QueryBuilder<T, T[]>
) => Promise<T[]>;

type MutationFunction<T extends {}> = (
  query: Knex.QueryBuilder<T, any>
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

  constructor(knexInstance: Knex) {
    if (!knexInstance) {
      throw new Error(
        "A Knex.js instance is required to initialize HookableDB."
      );
    }
    this.knex = knexInstance;
    this.events = new EventEmitter();
  }

  getKnexInstance(): Knex {
    return this.knex;
  }

  // Hookable query method
  async query<T extends {}>(
    tableName: string,
    queryFn: QueryFunction<T>,
    context?: HookContext
  ): Promise<T[]> {
    this.events.emit("beforeQuery", { tableName, context });
    await this.beforeQuery(tableName, context);
    const result = await queryFn(this.knex(tableName));
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
    context?: HookContext
  ): Promise<any> {
    this.events.emit("beforeMutation", {
      tableName,
      mutationType,
      data,
      context,
    });

    await this.beforeMutation(tableName, mutationType, data, context);
    const result = await mutationFn(this.knex<T>(tableName));

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
    context?: HookContext
  ): Promise<void> {
    // Example: Log fetched data
    // console.log(`[Query] Fetched from ${tableName}:`, result);
  }

  async beforeMutation(
    tableName: string,
    mutationType: MutationType,
    data?: any,
    context?: HookContext
  ): Promise<void> {
    // Example: Enforce permissions here
    console.log(`[Before ${mutationType}] On ${tableName}:`, data);
  }

  async afterMutation(
    tableName: string,
    mutationType: MutationType,
    result: any,
    data?: any,
    context?: HookContext
  ): Promise<void> {
    // Emit real-time events on mutations
    console.log(`[After ${mutationType}] On ${tableName}:`, { result, data });
  }

  // Expose the EventEmitter for external listeners
  on<Event extends keyof KnexHooksEvents>(
    event: Event,
    listener: KnexHooksEvents[Event]
  ): void {
    this.events.on(event, listener);
  }

  off<Event extends keyof KnexHooksEvents>(
    event: Event,
    listener: KnexHooksEvents[Event]
  ): void {
    this.events.off(event, listener);
  }
}

export default KnexHooks;
