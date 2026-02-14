/* eslint-disable @typescript-eslint/no-empty-object-type */
import EventEmitter from 'events';
import { Kysely } from 'kysely';
import { RealtimeAdapter } from './websocket/RealtimeAdapter';

type MutationType = 'create' | 'update' | 'delete';

type HookContext = Record<string, any>;

type KyselyHooksEvents = {
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

export class KyselyHooks {
  private db: Kysely<any>;
  private events: EventEmitter;
  private realtimeAdapter?: RealtimeAdapter;

  constructor(kyselyInstance: Kysely<any>, realtimeAdapter?: RealtimeAdapter) {
    if (!kyselyInstance) {
      throw new Error(
        'A Kysely instance is required to initialize KyselyHooks.',
      );
    }
    this.db = kyselyInstance;
    this.events = new EventEmitter();
    if (realtimeAdapter) {
      this.realtimeAdapter = realtimeAdapter;
    }
  }

  getDbInstance(): Kysely<any> {
    return this.db;
  }

  // Hookable query method
  async query<T>(
    tableName: string,
    queryFn: (db: Kysely<any>) => Promise<T[]>,
    context?: HookContext,
    trx?: Kysely<any>, // Transaction object in Kysely is just another Kysely instance with Transaction interface
  ): Promise<T[]> {
    if (this.events.listenerCount('beforeQuery')) {
      this.events.emit('beforeQuery', { tableName, context });
    }
    this.beforeQuery(tableName, context);

    // Use transaction if provided, otherwise use the main instance
    const executor = trx || this.db;
    const result = await queryFn(executor);

    if (this.events.listenerCount('afterQuery')) {
      this.events.emit('afterQuery', { tableName, result, context });
    }
    this.afterQuery(tableName, result, context);
    return result;
  }

  // Hookable mutation method
  async mutate<T>(
    tableName: string,
    mutationType: MutationType,
    mutationFn: (db: Kysely<any>) => Promise<any>,
    data?: any,
    context?: HookContext,
    trx?: Kysely<any>,
  ): Promise<any> {
    if (this.events.listenerCount('beforeMutation')) {
      this.events.emit('beforeMutation', {
        tableName,
        mutationType,
        data,
        context,
      });
    }

    this.beforeMutation(tableName, mutationType, data, context);

    // Use transaction if provided, otherwise use the main instance
    const executor = trx || this.db;
    const result = await mutationFn(executor);

    if (this.events.listenerCount('afterMutation')) {
      this.events.emit('afterMutation', {
        tableName,
        mutationType,
        result,
        data,
        context,
      });
    }

    await this.afterMutation(tableName, mutationType, result, data, context);
    return result;
  }

  // Hook methods (can be overridden or extended)
  beforeQuery(tableName: string, context?: HookContext): void {
    // Example: Add custom runtime RLS here
  }

  afterQuery(tableName: string, result: any, context?: HookContext): void {
    // Example: Log fetched data
  }

  beforeMutation(
    tableName: string,
    mutationType: MutationType,
    data?: any,
    context?: HookContext,
  ): void {
    // Example: Enforce permissions here
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
      //TODO: Check if real-time is allowed for the table
      this.realtimeAdapter.broadcast(tableName, mutationType, {
        type: mutationType,
        data: mutationType === 'delete' ? data : result,
      });
    }
  }

  // Expose the EventEmitter for external listeners
  on<Event extends keyof KyselyHooksEvents>(
    event: Event,
    listener: KyselyHooksEvents[Event],
  ): void {
    this.events.on(event, listener);
  }

  off<Event extends keyof KyselyHooksEvents>(
    event: Event,
    listener: KyselyHooksEvents[Event],
  ): void {
    this.events.off(event, listener);
  }
}
