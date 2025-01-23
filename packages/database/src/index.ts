import type { Knex } from "knex";
import { PermissionService } from "./permissionService";
import { enforcePermissions } from "./rlsManager";
import { DBInspector, type DatabaseSchema } from "./utils/inspector";
import { KnexHooks } from "./knex-hooks";
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
} from "./types.js";
import type { UserContext } from "./types.js";
import { createColumn } from "./utils/column-utils";
import {
  addForeignKey,
  dropForeignKey,
  modifySchema,
  truncateTable,
} from "./schema";
import { QueryHandler } from "./sdk/server";

export class ForgeDatabase {
  private queryHandler: QueryHandler;
  private hooks: KnexHooks;
  private permissionService: PermissionService;
  private dbInspector: DBInspector;
  private defaultPermissions: TablePermissions = {
    operations: {
      SELECT: [
        {
          allow: "private",
        },
      ],
      INSERT: [
        {
          allow: "private",
        },
      ],
      UPDATE: [
        {
          allow: "private",
        },
      ],
      DELETE: [
        {
          allow: "private",
        },
      ],
    },
  };

  constructor(private config: ForgeDatabaseConfig = {}) {
    if (!config.db) throw new Error("Database instance is required");

    this.hooks = config.hooks || new KnexHooks(config.db);
    this.queryHandler = new QueryHandler(this.hooks.getKnexInstance());
    this.permissionService =
      config.permissions || new PermissionService(config.db);
    this.dbInspector = new DBInspector(config.db);

    // Setup real-time listeners if enabled
    if (config.realtime) {
      this.hooks.on("beforeQuery", ({ tableName, context }) => {
        console.log(`[Real-Time Event] Query on ${tableName}:`, context);
      });
    }

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
        try {
          return await this.dbInspector.getDatabaseSchema();
        } catch (error) {
          throw error;
        }
      },
      create: async (payload: SchemaCreateParams) => {
        try {
          const { tableName, columns } = payload;

          if (!tableName) {
            throw new Error("Invalid request body");
          }

          const hasTable = await this.hooks
            .getKnexInstance()
            .schema.hasTable(tableName);
          if (hasTable) {
            console.log("Table already exists");
            throw new Error("Table already exists");
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
            message: "Table created successfully",
            tablename: tableName,
            action: "create",
          };
        } catch (error) {
          throw error;
        }
      },
      delete: async (tableName: string) => {
        try {
          await this.hooks
            .getKnexInstance()
            .schema.dropTableIfExists(tableName);

          await this.permissionService.deletePermissionsForTable(tableName);

          return {
            message: "Table deleted successfully",
            tablename: tableName,
            action: "delete",
          };
        } catch (error) {
          throw error;
        }
      },
      modify: async (payload: ModifySchemaParams) => {
        try {
          return await modifySchema(this.hooks.getKnexInstance(), payload);
        } catch (error) {
          throw error;
        }
      },
      addForeingKey: async (payload: AddForeignKeyParams) => {
        try {
          return await addForeignKey(payload, this.hooks.getKnexInstance());
        } catch (error) {
          throw error;
        }
      },
      dropForeignKey: async (payload: DropForeignKeyParams) => {
        try {
          return await dropForeignKey(payload, this.hooks.getKnexInstance());
        } catch (error) {
          throw error;
        }
      },
      truncateTable: async (tableName: string) => {
        try {
          return await truncateTable(tableName, this.hooks.getKnexInstance());
        } catch (error) {
          throw error;
        }
      },
    },

    data: {
      query: async (
        tableName: string,
        params: DataQueryParams,
        user?: UserContext
      ) => {
        try {
          const queryParams = this.parseQueryParams(params);

          const records = await this.hooks.query(
            tableName,
            (query) => this.queryHandler.buildQuery(queryParams, query),
            queryParams
          );

          if (this.config.enforceRls && user) {
            return enforcePermissions(
              tableName,
              "SELECT",
              records,
              user,
              this.permissionService
            );
          }

          return records as any;
        } catch (error) {
          throw error;
        }
      },

      create: async (params: DataMutationParams, user?: UserContext) => {
        try {
          const { data, tableName } = params;

          // Handle both single record and array of records
          const isArray = Array.isArray(data);
          const records = isArray ? data : [data];

          // Validate records
          if (
            !records.length ||
            !records.every(
              (record) =>
                typeof record === "object" && Object.keys(record).length > 0
            )
          ) {
            throw new Error("Invalid request body");
          }

          if (this.config.enforceRls && user) {
            return enforcePermissions(
              tableName,
              "INSERT",
              records,
              user,
              this.permissionService
            );
          }

          const result = this.hooks.mutate(
            tableName,
            "create",
            async (query) => query.insert(records).returning("*"),
            records
          );

          return result;
        } catch (error) {
          throw error;
        }
      },

      update: async (params: DataMutationParams, user?: UserContext) => {
        try {
          const { id, tableName, data } = params;

          if (this.config.enforceRls && user) {
            return enforcePermissions(
              tableName,
              "UPDATE",
              data,
              user,
              this.permissionService
            );
          }

          const result = this.hooks.mutate(
            tableName,
            "update",
            async (query) => query.where({ id }).update(data).returning("*"),

            { id, ...data }
          );

          return result;
        } catch (error) {
          throw error;
        }
      },

      delete: async (params: DataDeleteParams, user?: UserContext) => {
        try {
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
              "DELETE",
              record,
              user,
              this.permissionService
            );
          }

          return this.hooks.mutate(
            tableName,
            "delete",
            async (query) => query.where({ id }).delete(),
            { id }
          );
        } catch (error) {
          throw error;
        }
      },
    },

    permissions: {
      get: async (params: PermissionParams) => {
        try {
          const { tableName } = params;
          return this.permissionService.getPermissionsForTable(tableName);
        } catch (error) {
          throw error;
        }
      },

      set: async (params: PermissionParams) => {
        try {
          const { tableName, permissions } = params;

          if (!permissions) {
            throw new Error("Permissions object is required");
          }

          return this.permissionService.setPermissionsForTable(
            tableName,
            permissions
          );
        } catch (error) {
          throw error;
        }
      },
    },
  };

  private parseQueryParams(params: Record<string, any>): Record<string, any> {
    const queryParams: Record<string, any> = {};

    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === "string") {
        try {
          queryParams[key] = JSON.parse(value);
        } catch {
          if (key === "limit" || key === "offset") {
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

// Export types
export * from "./types.js";
export * from "./utils/column-utils.js";
export * from "./utils/inspector.js";
export * from "./knex-hooks.js";
export * from "./permissionService.js";
export * from "./rlsManager.js";
export * from "./schema.js";
export * from "./sdk/server.js";
