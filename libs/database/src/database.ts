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

  public getEndpoints() {
    return this.endpoints;
  }

  public getKnexInstance(): Knex {
    return this.hooks.getKnexInstance();
  }

  public endpoints: ForgeDatabaseEndpoints = {
    schema: {
      get: async (): Promise<DatabaseSchema> => {
        return await this.dbInspector.getDatabaseSchema();
      },
      create: async (payload: SchemaCreateParams) => {
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

        await this.hooks
          .getKnexInstance()
          .schema.createTable(tableName, (table) => {
            columns.forEach((col: any) =>
              createColumn(table, col, this.hooks.getKnexInstance())
            );
          });

        this.permissionService.setPermissionsForTable(
          tableName,
          this.defaultPermissions
        );
        return {
          message: 'Table created successfully',
          tablename: tableName,
          action: 'create',
        };
      },
      delete: async (tableName: string) => {
        await this.hooks.getKnexInstance().schema.dropTableIfExists(tableName);

        await this.permissionService.deletePermissionsForTable(tableName);

        return {
          message: 'Table deleted successfully',
          tablename: tableName,
          action: 'delete',
        };
      },
      modify: async (payload: ModifySchemaParams) => {
        return await modifySchema(this.hooks.getKnexInstance(), payload);
      },
      addForeingKey: async (payload: AddForeignKeyParams) => {
        return await addForeignKey(payload, this.hooks.getKnexInstance());
      },
      dropForeignKey: async (payload: DropForeignKeyParams) => {
        return await dropForeignKey(payload, this.hooks.getKnexInstance());
      },
      truncateTable: async (tableName: string) => {
        return await truncateTable(tableName, this.hooks.getKnexInstance());
      },
      getTableSchema: async (tableName: string) => {
        const tableInfo = await this.dbInspector.getTableInfo(tableName);
        return {
          name: tableName,
          info: tableInfo,
        };
      },
      getTables: async () => {
        return await this.dbInspector.getTables();
      },
      getTablePermissions: async (tableName: string) => {
        return await this.permissionService.getPermissionsForTable(tableName);
      },
      getTableSchemaWithPermissions: async (tableName: string) => {
        const tableInfo = await this.dbInspector.getTableInfo(tableName);
        const permissions = await this.permissionService.getPermissionsForTable(
          tableName
        );
        return {
          name: tableName,
          info: tableInfo,
          permissions,
        };
      },
    },

    data: {
      query: async (
        tableName: string,
        params: DataQueryParams,
        user?: UserContext
      ) => {
        const queryParams = this.parseQueryParams(params);

        const records = await this.hooks.query(
          tableName,
          (query) => this.queryHandler.buildQuery(queryParams, query),
          queryParams
        );

        if (this.config.enforceRls && user) {
          return enforcePermissions(
            tableName,
            'SELECT',
            records,
            user,
            this.permissionService
          );
        }

        return records as any;
      },

      create: async (params: DataMutationParams, user?: UserContext) => {
        const { data, tableName } = params;

        console.log('data-db', data, tableName);

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

        if (this.config.enforceRls && user) {
          return enforcePermissions(
            tableName,
            'INSERT',
            records,
            user,
            this.permissionService
          );
        }

        const result = this.hooks.mutate(
          tableName,
          'create',
          async (query) => query.insert(records).returning('*'),
          records
        );

        return result;
      },

      update: async (params: DataMutationParams, user?: UserContext) => {
        const { id, tableName, data } = params;

        if (this.config.enforceRls && user) {
          return enforcePermissions(
            tableName,
            'UPDATE',
            data,
            user,
            this.permissionService
          );
        }

        const result = this.hooks.mutate(
          tableName,
          'update',
          async (query) => query.where({ id }).update(data).returning('*'),

          { id, ...data }
        );

        return result;
      },

      delete: async (params: DataDeleteParams, user?: UserContext) => {
        const { id, tableName } = params;

        // get the record to enforce permissions
        const record = await this.hooks.query(
          tableName,
          (query) => {
            return query.where({ id });
          },
          { id }
        );

        if (this.config.enforceRls && user) {
          return enforcePermissions(
            tableName,
            'DELETE',
            record,
            user,
            this.permissionService
          );
        }

        return this.hooks.mutate(
          tableName,
          'delete',
          async (query) => query.where({ id }).delete(),
          { id }
        );
      },
    },

    permissions: {
      get: async (params: PermissionParams) => {
        const { tableName } = params;
        return this.permissionService.getPermissionsForTable(tableName);
      },

      set: async (params: PermissionParams) => {
        const { tableName, permissions } = params;

        if (!permissions) {
          throw new Error('Permissions object is required');
        }

        return this.permissionService.setPermissionsForTable(
          tableName,
          permissions
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

// Export factory function
export const createForgeDatabase = (config: ForgeDatabaseConfig) => {
  return new ForgeDatabase(config);
};
