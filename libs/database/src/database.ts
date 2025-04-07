import type { Knex } from 'knex';
import { PermissionService } from './permissionService';
import { enforcePermissions } from './rlsManager';
import { DBInspector, type DatabaseSchema } from './utils/inspector';
import { KnexHooks } from './knex-hooks';
import type {
  AddForeignKeyParams,
  DataDeleteParams,
  DataMutationParams,
  DataQueryParams,
  DropForeignKeyParams,
  ForgeDatabaseConfig,
  ForgeDatabaseEndpoints,
  ModifySchemaParams,
  PermissionParams,
  SchemaCreateParams,
  TablePermissions,
} from './types';
import type { UserContext } from './types';
import { createColumn } from './utils/column-utils';
import {
  addForeignKey,
  dropForeignKey,
  modifySchema,
  truncateTable,
} from './schema';
import { QueryHandler } from './sdk/server';
import { WebSocketManager } from './websocket/WebSocketManager';

export class ForgeDatabase {
  private queryHandler: QueryHandler;
  private hooks: KnexHooks;
  private permissionService: PermissionService;
  private dbInspector: DBInspector;
  private defaultPermissions: TablePermissions = {
    operations: {
      SELECT: [
        {
          allow: 'private',
        },
      ],
      INSERT: [
        {
          allow: 'private',
        },
      ],
      UPDATE: [
        {
          allow: 'private',
        },
      ],
      DELETE: [
        {
          allow: 'private',
        },
      ],
    },
  };
  private wsManager?: WebSocketManager;

  constructor(private config: ForgeDatabaseConfig = {}) {
    if (!config.db) throw new Error('Database instance is required');

    this.permissionService =
      config.permissions || new PermissionService(config.db);
    this.dbInspector = new DBInspector(config.db);

    // Initialize WebSocket manager if realtime is enabled
    if (config.realtime) {
      this.wsManager = new WebSocketManager(
        config.websocketPort || 9001,
        config.permissions || new PermissionService(config.db)
      );
    }
    this.hooks = config.hooks || new KnexHooks(config.db, this.wsManager);
    this.queryHandler = new QueryHandler(this.hooks.getKnexInstance());

    // Set default permissions for all tables
    if (config.defaultPermissions) {
      this.defaultPermissions = config.defaultPermissions;
    }
  }

  /**
   * Get the database schema
   * @returns Database schema
   */
  public getEndpoints() {
    return this.endpoints;
  }

  /**
   * Get the knex instance
   * @returns Knex instance
   */
  public getKnexInstance(): Knex {
    return this.hooks.getKnexInstance();
  }

  /**
   * Execute a function within a transaction
   * @param callback Function to execute within the transaction
   * @returns Result of the callback function
   */
  public async transaction<T>(
    callback: (trx: Knex.Transaction) => Promise<T>
  ): Promise<T> {
    try {
      return await this.hooks.getKnexInstance().transaction(callback);
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  }

  /**
   * Get the endpoints for the database
   * @returns Endpoints for the database
   */
  public endpoints: ForgeDatabaseEndpoints = {
    /**
     * Work with the database schema
     * @returns Schema endpoints
     */
    schema: {
      get: async (trx?: Knex.Transaction): Promise<DatabaseSchema> => {
        return await this.dbInspector.getDatabaseSchema();
      },
      create: async (payload: SchemaCreateParams, trx?: Knex.Transaction) => {
        // If no transaction is provided, create one internally
        // if (!trx) {
        //   return this.transaction(async (newTrx) => {
        //     return await this.endpoints.schema.create(payload, newTrx);
        //   });
        // }

        const { tableName, columns } = payload;

        if (!tableName) {
          throw new Error('Invalid request body');
        }

        const hasTable = await this.hooks
          .getKnexInstance()
          .schema.hasTable(tableName);
        if (hasTable) {
          console.log('Table already exists');
          throw new Error('Table already exists');
          // await this.hooks
          //   .getKnexInstance()
          //   .schema.dropTableIfExists(tableName);
          // console.log("Table dropped");
          // await this.permissionService.deletePermissionsForTable(tableName);
          // console.log("Permissions deleted");
        }

        // Use transaction if provided, otherwise use the knex instance
        const schemaBuilder = trx
          ? trx.schema
          : this.hooks.getKnexInstance().schema;
        await schemaBuilder.createTable(tableName, (table) => {
          columns.forEach((col: any) =>
            createColumn(table, col, this.hooks.getKnexInstance())
          );
        });

        this.permissionService.setPermissionsForTable(
          tableName,
          this.defaultPermissions,
          trx
        );
        return {
          message: 'Table created successfully',
          tablename: tableName,
          action: 'create',
        };
      },
      delete: async (tableName: string, trx?: Knex.Transaction) => {
        // Use transaction if provided, otherwise use the knex instance
        const schemaBuilder = trx
          ? trx.schema
          : this.hooks.getKnexInstance().schema;
        await schemaBuilder.dropTableIfExists(tableName);

        await this.permissionService.deletePermissionsForTable(tableName, trx);

        return {
          message: 'Table deleted successfully',
          tablename: tableName,
          action: 'delete',
        };
      },
      modify: async (payload: ModifySchemaParams, trx?: Knex.Transaction) => {
        return await modifySchema(this.hooks.getKnexInstance(), payload, trx);
      },
      addForeingKey: async (
        payload: AddForeignKeyParams,
        trx?: Knex.Transaction
      ) => {
        // If no transaction is provided, create one internally
        if (!trx) {
          return this.transaction(async (newTrx) => {
            return await this.endpoints.schema.addForeingKey(payload, newTrx);
          });
        }
        // Use transaction if provided, otherwise use the knex instance
        return await addForeignKey(payload, this.hooks.getKnexInstance(), trx);
      },
      dropForeignKey: async (
        payload: DropForeignKeyParams,
        trx?: Knex.Transaction
      ) => {
        if (!trx) {
          return this.transaction(async (newTrx) => {
            return await this.endpoints.schema.dropForeignKey(payload, newTrx);
          });
        }
        return await dropForeignKey(payload, this.hooks.getKnexInstance(), trx);
      },
      truncateTable: async (tableName: string, trx?: Knex.Transaction) => {
        // If no transaction is provided, create one internally
        if (!trx) {
          return this.transaction(async (newTrx) => {
            return await this.endpoints.schema.truncateTable(tableName, newTrx);
          });
        }
        return await truncateTable(
          tableName,
          this.hooks.getKnexInstance(),
          trx
        );
      },
      getTableSchema: async (tableName: string, trx?: Knex.Transaction) => {
        const tableInfo = await this.dbInspector.getTableInfo(tableName);
        return {
          name: tableName,
          info: tableInfo,
        };
      },
      getTables: async (trx?: Knex.Transaction) => {
        return await this.dbInspector.getTables();
      },
      getTablePermissions: async (
        tableName: string,
        trx?: Knex.Transaction
      ) => {
        // If no transaction is provided, create one internally
        if (!trx) {
          return this.transaction(async (newTrx) => {
            return await this.endpoints.schema.getTablePermissions(
              tableName,
              newTrx
            );
          });
        }
        return await this.permissionService.getPermissionsForTable(
          tableName,
          trx
        );
      },
      getTableSchemaWithPermissions: async (
        tableName: string,
        trx?: Knex.Transaction
      ) => {
        // If no transaction is provided, create one internally
        if (!trx) {
          return this.transaction(async (newTrx) => {
            return await this.endpoints.schema.getTableSchemaWithPermissions(
              tableName,
              newTrx
            );
          });
        }

        const tableInfo = await this.dbInspector.getTableInfo(tableName);
        const permissions = await this.permissionService.getPermissionsForTable(
          tableName,
          trx
        );
        return {
          name: tableName,
          info: tableInfo,
          permissions,
        };
      },
    },

    /**
     * Work with the database data
     * @returns Data endpoints
     */
    data: {
      query: async (
        tableName: string,
        params: DataQueryParams,
        user?: UserContext,
        isSystem = false,
        trx?: Knex.Transaction
      ) => {
        // If no transaction is provided, create one internally and manage it
        if (!trx) {
          return this.transaction(async (newTrx) => {
            return await this.endpoints.data.query(
              tableName,
              params,
              user,
              isSystem,
              newTrx
            );
          });
        }

        const queryParams = this.parseQueryParams(params);

        if (!this.config.enforceRls || isSystem) {
          return this.hooks.query(
            tableName,
            (query) => this.queryHandler.buildQuery(queryParams, query),
            queryParams,
            trx
          );
        }

        if (!user && !isSystem && this.config.enforceRls) {
          throw new Error('User is required to query a record');
        }

        const {
          status: initialStatus,
          hasFieldCheck: initialHasFieldCheck,
          hasCustomFunction: initialHasCustomFunction,
        } = await enforcePermissions(
          tableName,
          'SELECT',
          user,
          this.permissionService,
          undefined,
          this.hooks.getKnexInstance()
        );

        if (
          !initialStatus &&
          !initialHasFieldCheck &&
          !initialHasCustomFunction
        ) {
          throw new Error(
            `User does not have permission to query table "${tableName}"`
          );
        }

        if (initialStatus) {
          // If the user has permission to query, proceed with the query
          return this.hooks.query(
            tableName,
            (query) => this.queryHandler.buildQuery(queryParams, query),
            queryParams,
            trx
          );
        }

        const records = await this.hooks.query(
          tableName,
          (query) => this.queryHandler.buildQuery(queryParams, query),
          queryParams,
          trx
        );

        if (!records.length) {
          return records;
        }

        const { status, row } = await enforcePermissions(
          tableName,
          'SELECT',
          user,
          this.permissionService,
          records,
          this.hooks.getKnexInstance()
        );

        if (!status) {
          throw new Error(
            `User does not have permission to query table "${tableName}"`
          );
        }

        return row as any;
      },

      create: async (
        params: DataMutationParams,
        user?: UserContext,
        isSystem = false,
        trx?: Knex.Transaction
      ) => {
        // If no transaction is provided, create one internally and manage it
        if (!trx) {
          return this.transaction(async (newTrx) => {
            return await this.endpoints.data.create(
              params,
              user,
              isSystem,
              newTrx
            );
          });
        }

        const { data, tableName } = params;

        // console.log('data-db', data, tableName);

        // Handle both single record and array of records
        const isArray = Array.isArray(data);
        const records = isArray ? data : [data];

        // Validate records
        if (
          !records.length ||
          !records.every(
            (record) =>
              typeof record === 'object' && Object.keys(record).length > 0
          )
        ) {
          console.log('Invalid request body', records);
          throw new Error('Invalid request body');
        }

        if (!this.config.enforceRls || isSystem) {
          return this.hooks.mutate(
            tableName,
            'create',
            async (query) => query.insert(records).returning('*'),
            records,
            undefined,
            trx
          );
        }

        if (!user && !isSystem && this.config.enforceRls) {
          throw new Error('User is required to create a record');
        }

        const {
          status: initialStatus,
          hasFieldCheck: initialHasFieldCheck,
          hasCustomFunction: initialHasCustomFunction,
        } = await enforcePermissions(
          tableName,
          'INSERT',
          user,
          this.permissionService,
          undefined,
          this.hooks.getKnexInstance()
        );

        if (
          !initialStatus &&
          !initialHasFieldCheck &&
          !initialHasCustomFunction
        ) {
          throw new Error(
            `User does not have permission to create record in table "${tableName}"`
          );
        }

        if (initialStatus) {
          // If the user has permission to create, proceed with the creation
          return this.hooks.mutate(
            tableName,
            'create',
            async (query) => query.insert(records).returning('*'),
            records,
            undefined,
            trx
          );
        }

        const { status, row } = await enforcePermissions(
          tableName,
          'INSERT',
          user,
          this.permissionService,
          records,
          this.hooks.getKnexInstance()
        );

        if (!status) {
          throw new Error(
            `User does not have permission to create record in table "${tableName}"`
          );
        }

        if (!row || (Array.isArray(row) && row.length === 0)) {
          throw new Error(
            `User does not have permission to create this record in table "${tableName}"`
          );
        }

        const result = this.hooks.mutate(
          tableName,
          'create',
          async (query) => query.insert(row).returning('*'),
          row,
          undefined,
          trx
        );

        return result;
      },

      update: async (
        params: DataMutationParams,
        user?: UserContext,
        isSystem = false,
        trx?: Knex.Transaction
      ) => {
        // If no transaction is provided, create one internally and manage it
        if (!trx) {
          return this.transaction(async (newTrx) => {
            return await this.endpoints.data.update(
              params,
              user,
              isSystem,
              newTrx
            );
          });
        }

        const { id, tableName, data } = params;

        if (!this.config.enforceRls || isSystem) {
          const result = this.hooks.mutate(
            tableName,
            'update',
            async (query) => query.where({ id }).update(data).returning('*'),
            { id, ...data },
            undefined,
            trx
          );

          return result;
        }

        if (!user && !isSystem && this.config.enforceRls) {
          throw new Error('User is required to update a record');
        }

        const {
          status: initialStatus,
          hasFieldCheck: initialHasFieldCheck,
          hasCustomFunction: initialHasCustomFunction,
        } = await enforcePermissions(
          tableName,
          'UPDATE',
          user,
          this.permissionService,
          undefined,
          this.hooks.getKnexInstance()
        );

        if (
          !initialStatus &&
          !initialHasFieldCheck &&
          !initialHasCustomFunction
        ) {
          throw new Error(
            `User does not have permission to delete record with id ${id}`
          );
        }

        if (initialStatus) {
          // If the user has permission to delete, proceed with the deletion
          const result = this.hooks.mutate(
            tableName,
            'update',
            async (query) => query.where({ id }).update(data).returning('*'),
            { id, ...data },
            undefined,
            trx
          );

          return result;
        }

        const record = await this.hooks.query(
          tableName,
          (query) => {
            return query.where({ id });
          },
          { id },
          trx
        );

        const { status } = await enforcePermissions(
          tableName,
          'UPDATE',
          user,
          this.permissionService,
          record[0],
          this.hooks.getKnexInstance()
        );

        if (!status) {
          throw new Error(
            `User does not have permission to update record with id ${id}`
          );
        }

        const result = this.hooks.mutate(
          tableName,
          'update',
          async (query) => query.where({ id }).update(data).returning('*'),
          { id, ...data },
          undefined,
          trx
        );

        return result;
      },

      delete: async (
        params: DataDeleteParams,
        user?: UserContext,
        isSystem = false,
        trx?: Knex.Transaction
      ) => {
        // If no transaction is provided, create one internally and manage it
        if (!trx) {
          return this.transaction(async (newTrx) => {
            return await this.endpoints.data.delete(
              params,
              user,
              isSystem,
              newTrx
            );
          });
        }

        const { id, tableName } = params;

        if (!this.config.enforceRls || isSystem) {
          return this.hooks.mutate(
            tableName,
            'delete',
            async (query) => query.where({ id }).delete(),
            { id },
            undefined,
            trx
          );
        }

        if (!user && !isSystem && this.config.enforceRls) {
          throw new Error('User is required to delete a record');
        }

        const {
          status: initialStatus,
          hasFieldCheck: initialHasFieldCheck,
          hasCustomFunction: initialHasCustomFunction,
        } = await enforcePermissions(
          tableName,
          'DELETE',
          user,
          this.permissionService,
          undefined,
          this.hooks.getKnexInstance()
        );

        if (
          !initialStatus &&
          !initialHasFieldCheck &&
          !initialHasCustomFunction
        ) {
          throw new Error(
            `User does not have permission to delete record with id ${id}`
          );
        }

        if (initialStatus) {
          // If the user has permission to delete, proceed with the deletion
          return this.hooks.mutate(
            tableName,
            'delete',
            async (query) => query.where({ id }).delete(),
            { id },
            undefined,
            trx
          );
        }

        // get the record to enforce permissions
        const record = await this.hooks.query(
          tableName,
          (query) => {
            return query.where({ id });
          },
          { id },
          trx
        );

        const { status } = await enforcePermissions(
          tableName,
          'DELETE',
          user,
          this.permissionService,
          record,
          this.hooks.getKnexInstance()
        );
        if (!status) {
          throw new Error(
            `User does not have permission to delete record with id ${id}`
          );
        }

        return this.hooks.mutate(
          tableName,
          'delete',
          async (query) => query.where({ id }).delete(),
          { id },
          undefined,
          trx
        );
      },
    },

    /**
     * Work with the database permissions
     * @returns Permissions endpoints
     */
    permissions: {
      get: async (params: PermissionParams, trx?: Knex.Transaction) => {
        // If no transaction is provided, create one internally
        if (!trx) {
          return this.transaction(async (newTrx) => {
            return await this.endpoints.permissions.get(params, newTrx);
          });
        }

        const { tableName } = params;
        return this.permissionService.getPermissionsForTable(tableName, trx);
      },

      set: async (params: PermissionParams, trx?: Knex.Transaction) => {
        // If no transaction is provided, create one internally and manage it
        if (!trx) {
          return this.transaction(async (newTrx) => {
            return await this.endpoints.permissions.set(params, newTrx);
          });
        }

        const { tableName, permissions } = params;

        if (!permissions) {
          throw new Error('Permissions object is required');
        }

        return this.permissionService.setPermissionsForTable(
          tableName,
          permissions,
          trx
        );
      },
    },
  };

  private parseQueryParams(params: Record<string, any>): Record<string, any> {
    const queryParams: Record<string, any> = {};

    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === 'string') {
        try {
          queryParams[key] = JSON.parse(value);
        } catch {
          if (key === 'limit' || key === 'offset') {
            queryParams[key] = parseInt(value, 10) || 10;
          } else {
            queryParams[key] = value;
          }
        }
      } else {
        queryParams[key] = value;
      }
    });

    return queryParams;
  }
}

/**
 * Create a new instance of the ForgeDatabase class
 * @param config Configuration object for the ForgeDatabase instance
 * @returns A new instance of the ForgeDatabase class
 */
export const createForgeDatabase = (config: ForgeDatabaseConfig) => {
  return new ForgeDatabase(config);
};
