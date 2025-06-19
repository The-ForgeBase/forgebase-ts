import type { Knex } from "knex";
import { PermissionService } from "./permissionService";
import { enforcePermissions } from "./rlsManager";
import { DBInspector, type DatabaseSchema } from "./utils/inspector";
import { KnexHooks } from "./knex-hooks";
import {
  FG_PERMISSION_TABLE,
  type AddForeignKeyParams,
  type DataDeleteParams,
  type DataMutationParams,
  type DataQueryParams,
  type DropForeignKeyParams,
  type ForgeDatabaseConfig,
  type ForgeDatabaseEndpoints,
  type ModifySchemaParams,
  type PermissionParams,
  type PermissionInitializationReport,
  type SchemaCreateParams,
  type TablePermissions,
} from "./types";
import type {
  AdvanceDataDeleteParams,
  AdvanceDataMutationParams,
  UserContext,
} from "./types";
import { createColumn } from "./utils/column-utils";
import {
  addForeignKey,
  dropForeignKey,
  modifySchema,
  truncateTable,
} from "./schema";
import { QueryHandler } from "./sdk/server";
import { SSEManager } from "./websocket/SSEManager";
import { RealtimeAdapter } from "./websocket/RealtimeAdapter";
import { initializePermissions } from "./utils/permission-initializer";

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
  public realtimeAdapter?: RealtimeAdapter;
  private excludedTables: string[] = [FG_PERMISSION_TABLE];

  constructor(private config: ForgeDatabaseConfig = {}) {
    if (!config.db) throw new Error("Database instance is required");

    if (config.excludedTables) {
      this.excludedTables = [...this.excludedTables, ...config.excludedTables];
    }

    this.permissionService =
      config.permissionsService || new PermissionService(config.db);
    this.dbInspector = new DBInspector(config.db);

    // Initialize realtime adapter if realtime is enabled
    if (config.realtime) {
      const port = config.websocketPort || 9001;

      this.realtimeAdapter = new SSEManager(port, this.permissionService);
    }
    this.hooks = config.hooks || new KnexHooks(config.db, this.realtimeAdapter);
    this.queryHandler = new QueryHandler(this.hooks.getKnexInstance());

    // Set default permissions for all tables
    if (config.defaultPermissions) {
      this.defaultPermissions = config.defaultPermissions;
    }

    // Initialize permissions for all tables if enabled
    if (config.initializePermissions) {
      this.initializeTablePermissions();
    }
  }

  /**
   * Initialize permissions for all tables in the database
   * This is a non-blocking operation that runs in the background
   */
  private initializeTablePermissions(): void {
    const { permissionReportPath, onPermissionInitComplete } = this.config;

    // Use the public method to avoid code duplication
    this.initializePermissions(permissionReportPath, onPermissionInitComplete);
  }

  /**
   * Add a table to the excluded tables list
   * @param tables List of tables to exclude
   */
  public addExcludedTables(tables: string[]) {
    this.excludedTables = [...this.excludedTables, ...tables];
  }
  /**
   * Remove a table from the excluded tables list
   * @param tables List of tables to include
   */
  public removeExcludedTables(tables: string[]) {
    this.excludedTables = this.excludedTables.filter(
      (table) => !tables.includes(table),
    );
  }

  /**
   * Manually trigger permission initialization for all tables
   * @param reportPath Optional path to save the report file
   * @param onComplete Optional callback function to call when initialization is complete
   */
  public initializePermissions(
    reportPath?: string,
    onComplete?: (report: PermissionInitializationReport) => void,
  ): void {
    // Use provided parameters or fall back to config values
    const finalReportPath = reportPath || this.config.permissionReportPath;
    const finalCallback = onComplete || this.config.onPermissionInitComplete;

    // Start the initialization process
    initializePermissions(
      this.hooks.getKnexInstance(),
      this.permissionService,
      this.dbInspector,
      this.excludedTables,
      this.defaultPermissions,
      finalReportPath,
      finalCallback,
    );

    console.log("Permission initialization started in the background");
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

  public getHooksDb(): KnexHooks {
    return this.hooks;
  }

  public getPermissionService(): PermissionService {
    return this.permissionService;
  }

  /**
   * Execute a function within a transaction
   * @param callback Function to execute within the transaction
   * @returns Result of the callback function
   */
  public async transaction<T>(
    callback: (trx: Knex.Transaction) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.hooks.getKnexInstance().transaction(callback);
    } catch (error) {
      console.error("Transaction error:", error);
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
      get: async (trx?: Knex.Transaction) => {
        return await this.dbInspector.getDatabaseSchema(this.excludedTables);
      },
      create: async (payload: SchemaCreateParams, trx?: Knex.Transaction) => {
        const { tableName, columns } = payload;

        if (!tableName) {
          return {
            status: false,
            message: "Invalid request body",
            tablename: tableName,
            action: "create",
          };
        }

        const hasTable = await this.hooks
          .getKnexInstance()
          .schema.hasTable(tableName);
        if (hasTable) {
          return {
            status: false,
            message: "Table already exists",
            tablename: tableName,
            action: "create",
          };
        }

        // Use transaction if provided, otherwise use the knex instance
        const schemaBuilder = trx
          ? trx.schema
          : this.hooks.getKnexInstance().schema;
        await schemaBuilder.createTable(tableName, (table) => {
          columns.forEach((col: any) =>
            createColumn(table, col, this.hooks.getKnexInstance()),
          );
        });

        this.permissionService.setPermissionsForTable(
          tableName,
          this.defaultPermissions,
          trx,
        );
        return {
          message: "Table created successfully",
          tablename: tableName,
          action: "create",
          status: true,
        };
      },
      delete: async (tableName: string, trx?: Knex.Transaction) => {
        if (this.excludedTables.includes(tableName)) {
          return {
            status: false,
            message: `Table ${tableName} is excluded from operations`,
            tablename: tableName,
            action: "delete",
          };
        }
        // Use transaction if provided, otherwise use the knex instance
        const schemaBuilder = trx
          ? trx.schema
          : this.hooks.getKnexInstance().schema;
        await schemaBuilder.dropTableIfExists(tableName);

        await this.permissionService.deletePermissionsForTable(tableName, trx);

        return {
          message: "Table deleted successfully",
          tablename: tableName,
          action: "delete",
          status: true,
        };
      },
      modify: async (payload: ModifySchemaParams, trx?: Knex.Transaction) => {
        if (this.excludedTables.includes(payload.tableName)) {
          return {
            status: false,
            message: `Table ${payload.tableName} is excluded from operations`,
            tablename: payload.tableName,
            action: "modify",
          };
        }
        const result = await modifySchema(
          this.hooks.getKnexInstance(),
          payload,
          trx,
        );
        return {
          ...result,
          tablename: payload.tableName,
          action: "modify",
          status: true,
        };
      },
      addForeingKey: async (
        payload: AddForeignKeyParams,
        trx?: Knex.Transaction,
      ) => {
        if (this.excludedTables.includes(payload.tableName)) {
          return {
            status: false,
            message: `Table ${payload.tableName} is excluded from operations`,
            tablename: payload.tableName,
            action: "addForeingKey",
          };
        }

        if (this.excludedTables.includes(payload.foreignTableName)) {
          return {
            status: false,
            message: `Table ${payload.foreignTableName} is excluded from operations`,
            tablename: payload.foreignTableName,
            action: "addForeingKey",
          };
        }

        // If no transaction is provided, create one internally
        if (!trx) {
          return this.transaction(async (newTrx) => {
            return await this.endpoints.schema.addForeingKey(payload, newTrx);
          });
        }
        // Use transaction if provided, otherwise use the knex instance
        const result = await addForeignKey(
          payload,
          this.hooks.getKnexInstance(),
          trx,
        );
        return {
          ...result,
          tablename: payload.tableName,
          action: "addForeingKey",
          status: true,
        };
      },
      dropForeignKey: async (
        payload: DropForeignKeyParams,
        trx?: Knex.Transaction,
      ) => {
        if (this.excludedTables.includes(payload.tableName)) {
          return {
            status: false,
            message: `Table ${payload.tableName} is excluded from operations`,
            tablename: payload.tableName,
            action: "dropForeignKey",
          };
        }
        if (!trx) {
          return this.transaction(async (newTrx) => {
            return await this.endpoints.schema.dropForeignKey(payload, newTrx);
          });
        }
        const result = await dropForeignKey(
          payload,
          this.hooks.getKnexInstance(),
          trx,
        );
        return {
          ...result,
          tablename: payload.tableName,
          action: "dropForeignKey",
          status: true,
        };
      },
      truncateTable: async (tableName: string, trx?: Knex.Transaction) => {
        if (this.excludedTables.includes(tableName)) {
          return {
            status: false,
            message: `Table ${tableName} is excluded from operations`,
            tablename: tableName,
            action: "truncateTable",
          };
        }

        if (!trx) {
          return this.transaction(async (newTrx) => {
            return await this.endpoints.schema.truncateTable(tableName, newTrx);
          });
        }
        const result = await truncateTable(
          tableName,
          this.hooks.getKnexInstance(),
          trx,
        );
        return {
          ...result,
          tablename: tableName,
          action: "truncateTable",
          status: true,
        };
      },
      getTableSchema: async (tableName: string, trx?: Knex.Transaction) => {
        if (this.excludedTables.includes(tableName)) {
          return {
            status: false,
            message: `Table ${tableName} is excluded from operations`,
            tablename: tableName,
            action: "getTableSchema",
          };
        }
        const tableInfo = await this.dbInspector.getTableInfo(tableName);
        return {
          name: tableName,
          info: tableInfo,
          status: true,
        };
      },
      getTables: async (trx?: Knex.Transaction) => {
        let tables = await this.dbInspector.getTables();
        tables = tables.filter((t) => !this.excludedTables.includes(t));
        return {
          tables,
          status: true,
        };
      },
      getTablePermissions: async (
        tableName: string,
        trx?: Knex.Transaction,
      ) => {
        if (this.excludedTables.includes(tableName)) {
          return {
            status: false,
            message: `Table ${tableName} is excluded from operations`,
          };
        }
        // If no transaction is provided, create one internally
        if (!trx) {
          return this.transaction(async (newTrx) => {
            return await this.endpoints.schema.getTablePermissions(
              tableName,
              newTrx,
            );
          });
        }
        const permissions = await this.permissionService.getPermissionsForTable(
          tableName,
          trx,
        );
        return {
          permissions,
          status: true,
        };
      },
      getTableSchemaWithPermissions: async (
        tableName: string,
        trx?: Knex.Transaction,
      ) => {
        if (this.excludedTables.includes(tableName)) {
          return {
            status: false,
            message: `Table ${tableName} is excluded from operations`,
          };
        }
        // If no transaction is provided, create one internally
        if (!trx) {
          return this.transaction(async (newTrx) => {
            return await this.endpoints.schema.getTableSchemaWithPermissions(
              tableName,
              newTrx,
            );
          });
        }

        const tableInfo = await this.dbInspector.getTableInfo(tableName);
        const permissions = await this.permissionService.getPermissionsForTable(
          tableName,
          trx,
        );
        return {
          name: tableName,
          info: tableInfo,
          permissions,
          status: true,
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
        trx?: Knex.Transaction,
      ) => {
        if (this.excludedTables.includes(tableName)) {
          return {
            status: false,
            message: `Table ${tableName} is excluded from operations`,
          };
        }
        // If no transaction is provided, create one internally and manage it
        if (!trx) {
          return this.transaction(async (newTrx) => {
            return await this.endpoints.data.query(
              tableName,
              params,
              user,
              isSystem,
              newTrx,
            );
          });
        }

        const queryParams = this.parseQueryParams(params);

        if (!this.config.enforceRls || isSystem) {
          const records = await this.hooks.query(
            tableName,
            (query) => this.queryHandler.buildQuery(queryParams, query),
            queryParams,
            trx,
          );
          return {
            data: records as any,
            status: true,
          };
        }

        if (!user && !isSystem && this.config.enforceRls) {
          return {
            status: false,
            message: "Authentication required to query records",
          };
        }

        const {
          status: initialStatus,
          hasFieldCheck: initialHasFieldCheck,
          hasCustomFunction: initialHasCustomFunction,
        } = await enforcePermissions(
          tableName,
          "SELECT",
          user as UserContext,
          this.permissionService,
          undefined,
          this.hooks.getKnexInstance(),
        );

        if (
          !initialStatus &&
          !initialHasFieldCheck &&
          !initialHasCustomFunction
        ) {
          return {
            status: false,
            message: `User does not have permission to query table "${tableName}"`,
          };
        }

        const records = await this.hooks.query(
          tableName,
          (query) => this.queryHandler.buildQuery(queryParams, query),
          queryParams,
          trx,
        );

        if (initialStatus) {
          // If the user has permission to query, proceed with the query
          return {
            data: records as any,
            status: true,
          };
        }

        const { status, row } = await enforcePermissions(
          tableName,
          "SELECT",
          user as UserContext,
          this.permissionService,
          records,
          this.hooks.getKnexInstance(),
        );

        if (!status) {
          return {
            status: false,
            message: `User does not have permission to query table "${tableName}"`,
          };
        }

        return {
          data: row as any,
          status: true,
        };
      },

      create: async (
        params: DataMutationParams,
        user?: UserContext,
        isSystem = false,
        trx?: Knex.Transaction,
      ) => {
        if (this.excludedTables.includes(params.tableName)) {
          return {
            status: false,
            message: `Table ${params.tableName} is excluded from operations`,
          };
        }
        // If no transaction is provided, create one internally and manage it
        if (!trx) {
          return this.transaction(async (newTrx) => {
            return await this.endpoints.data.create(
              params,
              user,
              isSystem,
              newTrx,
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
              typeof record === "object" && Object.keys(record).length > 0,
          )
        ) {
          // console.log("Invalid request body", records);
          return {
            status: false,
            message: "Invalid request body",
          };
        }

        if (!this.config.enforceRls || isSystem) {
          const result = await this.hooks.mutate(
            tableName,
            "create",
            async (query) => query.insert(records).returning("*"),
            records,
            undefined,
            trx,
          );
          return {
            data: result,
            status: true,
          };
        }

        if (!user && !isSystem && this.config.enforceRls) {
          return {
            status: false,
            message: "Authentication required to create records",
          };
        }

        const {
          status: initialStatus,
          hasFieldCheck: initialHasFieldCheck,
          hasCustomFunction: initialHasCustomFunction,
        } = await enforcePermissions(
          tableName,
          "INSERT",
          user as UserContext,
          this.permissionService,
          undefined,
          this.hooks.getKnexInstance(),
        );

        if (
          !initialStatus &&
          !initialHasFieldCheck &&
          !initialHasCustomFunction
        ) {
          return {
            status: false,
            message: `User does not have permission to create record in table "${tableName}"`,
          };
        }

        if (initialStatus) {
          // If the user has permission to create, proceed with the creation
          const result = await this.hooks.mutate(
            tableName,
            "create",
            async (query) => query.insert(records).returning("*"),
            records,
            undefined,
            trx,
          );
          return {
            data: result,
            status: true,
          };
        }

        const { status, row } = await enforcePermissions(
          tableName,
          "INSERT",
          user as UserContext,
          this.permissionService,
          records,
          this.hooks.getKnexInstance(),
        );

        if (!status) {
          return {
            status: false,
            message: `User does not have permission to create record in table "${tableName}"`,
          };
        }

        if (!row || (Array.isArray(row) && row.length === 0)) {
          return {
            status: false,
            message: `User does not have permission to create record in table "${tableName}"`,
          };
        }

        const result = await this.hooks.mutate(
          tableName,
          "create",
          async (query) => query.insert(row).returning("*"),
          row,
          undefined,
          trx,
        );

        return {
          data: result,
          status: true,
        };
      },

      update: async (
        params: DataMutationParams,
        user?: UserContext,
        isSystem = false,
        trx?: Knex.Transaction,
      ) => {
        if (this.excludedTables.includes(params.tableName)) {
          return {
            status: false,
            message: `Table ${params.tableName} is excluded from operations`,
          };
        }
        // If no transaction is provided, create one internally and manage it
        if (!trx) {
          return this.transaction(async (newTrx) => {
            return await this.endpoints.data.update(
              params,
              user as UserContext,
              isSystem,
              newTrx,
            );
          });
        }

        const { id, tableName, data } = params;

        if (!this.config.enforceRls || isSystem) {
          const result = await this.hooks.mutate(
            tableName,
            "update",
            async (query) => query.where({ id }).update(data).returning("*"),
            { id, ...data },
            undefined,
            trx,
          );

          return {
            data: result,
            status: true,
          };
        }

        if (!user && !isSystem && this.config.enforceRls) {
          return {
            status: false,
            message: "Authentication required to update records",
          };
        }

        const {
          status: initialStatus,
          hasFieldCheck: initialHasFieldCheck,
          hasCustomFunction: initialHasCustomFunction,
        } = await enforcePermissions(
          tableName,
          "UPDATE",
          user as UserContext,
          this.permissionService,
          undefined,
          this.hooks.getKnexInstance(),
        );

        if (
          !initialStatus &&
          !initialHasFieldCheck &&
          !initialHasCustomFunction
        ) {
          return {
            status: false,
            message: `User does not have permission to delete record with id ${id}`,
          };
        }

        if (initialStatus) {
          // If the user has permission to delete, proceed with the deletion
          const result = await this.hooks.mutate(
            tableName,
            "update",
            async (query) => query.where({ id }).update(data).returning("*"),
            { id, ...data },
            undefined,
            trx,
          );

          return {
            data: result,
            status: true,
          };
        }

        const record = await this.hooks.query(
          tableName,
          (query) => {
            return query.where({ id });
          },
          { id },
          trx,
        );

        const { status } = await enforcePermissions(
          tableName,
          "UPDATE",
          user as UserContext,
          this.permissionService,
          record[0],
          this.hooks.getKnexInstance(),
        );

        if (!status) {
          return {
            status: false,
            message: `User does not have permission to update record with id ${id}`,
          };
        }

        const result = await this.hooks.mutate(
          tableName,
          "update",
          async (query) => query.where({ id }).update(data).returning("*"),
          { id, ...data },
          undefined,
          trx,
        );

        return {
          data: result,
          status: true,
        };
      },

      advanceUpdate: async (
        params: AdvanceDataMutationParams,
        user?: UserContext,
        isSystem = false,
        trx?: Knex.Transaction,
      ) => {
        if (this.excludedTables.includes(params.tableName)) {
          return {
            status: false,
            message: `Table ${params.tableName} is excluded from operations`,
          };
        }
        // If no transaction is provided, create one internally and manage it
        if (!trx) {
          return this.transaction(async (newTrx) => {
            return await this.endpoints.data.update(
              params,
              user as UserContext,
              isSystem,
              newTrx,
            );
          });
        }

        const { query, tableName, data } = params;

        const queryParams = this.parseQueryParams(query);

        if (!this.config.enforceRls || isSystem) {
          const result = await this.hooks.mutate(
            tableName,
            "update",
            async (query) =>
              this.queryHandler
                .buildQuery(queryParams, query)
                .update(data)
                .returning("*"),
            { ...data },
            undefined,
            trx,
          );

          return {
            data: result,
            status: true,
          };
        }

        if (!user && !isSystem && this.config.enforceRls) {
          return {
            status: false,
            message: "Authentication required to update records",
          };
        }

        const {
          status: initialStatus,
          hasFieldCheck: initialHasFieldCheck,
          hasCustomFunction: initialHasCustomFunction,
        } = await enforcePermissions(
          tableName,
          "UPDATE",
          user as UserContext,
          this.permissionService,
          undefined,
          this.hooks.getKnexInstance(),
        );

        if (
          !initialStatus &&
          !initialHasFieldCheck &&
          !initialHasCustomFunction
        ) {
          return {
            status: false,
            message: "User does not have permission to update this records",
          };
        }

        if (initialStatus) {
          // If the user has permission to delete, proceed with the deletion
          const result = await this.hooks.mutate(
            tableName,
            "update",
            async (query) =>
              this.queryHandler
                .buildQuery(queryParams, query)
                .update(data)
                .returning("*"),
            { ...data },
            queryParams,
            trx,
          );

          return {
            data: result,
            status: true,
          };
        }

        const records = await this.hooks.query(
          tableName,
          (query) => this.queryHandler.buildQuery(queryParams, query),
          queryParams,
          trx,
        );

        const { status } = await enforcePermissions(
          tableName,
          "UPDATE",
          user as UserContext,
          this.permissionService,
          records,
          this.hooks.getKnexInstance(),
        );

        if (!status) {
          return {
            status: false,
            message: "User does not have permission to update this records",
          };
        }

        const result = await this.hooks.mutate(
          tableName,
          "update",
          async (query) =>
            this.queryHandler
              .buildQuery(queryParams, query)
              .update(data)
              .returning("*"),
          { ...data },
          queryParams,
          trx,
        );

        return {
          data: result,
          status: true,
        };
      },

      delete: async (
        params: DataDeleteParams,
        user?: UserContext,
        isSystem = false,
        trx?: Knex.Transaction,
      ) => {
        if (this.excludedTables.includes(params.tableName)) {
          return {
            status: false,
            message: `Table ${params.tableName} is excluded from operations`,
          };
        }
        // If no transaction is provided, create one internally and manage it
        if (!trx) {
          return this.transaction(async (newTrx) => {
            return await this.endpoints.data.delete(
              params,
              user as UserContext,
              isSystem,
              newTrx,
            );
          });
        }

        const { id, tableName } = params;

        if (!this.config.enforceRls || isSystem) {
          const result = await this.hooks.mutate(
            tableName,
            "delete",
            async (query) =>
              query
                .where({ id })
                .del(["id"], { includeTriggerModifications: true }),
            { id },
            undefined,
            trx,
          );

          return {
            data: result,
            status: true,
          };
        }

        if (!user && !isSystem && this.config.enforceRls) {
          return {
            status: false,
            message: "Authentication required to delete records",
          };
        }

        const {
          status: initialStatus,
          hasFieldCheck: initialHasFieldCheck,
          hasCustomFunction: initialHasCustomFunction,
        } = await enforcePermissions(
          tableName,
          "DELETE",
          user as UserContext,
          this.permissionService,
          undefined,
          this.hooks.getKnexInstance(),
        );

        if (
          !initialStatus &&
          !initialHasFieldCheck &&
          !initialHasCustomFunction
        ) {
          return {
            status: false,
            message: `User does not have permission to delete record with id ${id}`,
          };
        }

        if (initialStatus) {
          // If the user has permission to delete, proceed with the deletion
          const result = await this.hooks.mutate(
            tableName,
            "delete",
            async (query) => query.where({ id }).delete(),
            { id },
            undefined,
            trx,
          );
          return {
            data: result,
            status: true,
          };
        }

        // get the record to enforce permissions
        const record = await this.hooks.query(
          tableName,
          (query) => {
            return query.where({ id });
          },
          { id },
          trx,
        );

        const { status } = await enforcePermissions(
          tableName,
          "DELETE",
          user as UserContext,
          this.permissionService,
          record,
          this.hooks.getKnexInstance(),
        );
        if (!status) {
          return {
            status: false,
            message: `User does not have permission to delete record with id ${id}`,
          };
        }

        const result = await this.hooks.mutate(
          tableName,
          "delete",
          async (query) => query.where({ id }).delete(),
          { id },
          undefined,
          trx,
        );

        return {
          data: result,
          status: true,
        };
      },

      advanceDelete: async (
        params: AdvanceDataDeleteParams,
        user?: UserContext,
        isSystem = false,
        trx?: Knex.Transaction,
      ) => {
        if (this.excludedTables.includes(params.tableName)) {
          return {
            status: false,
            message: `Table ${params.tableName} is excluded from operations`,
          };
        }
        // If no transaction is provided, create one internally and manage it
        if (!trx) {
          return this.transaction(async (newTrx) => {
            return await this.endpoints.data.advanceDelete(
              params,
              user as UserContext,
              isSystem,
              newTrx,
            );
          });
        }

        const { query, tableName } = params;

        const queryParams = this.parseQueryParams(query);

        if (!this.config.enforceRls || isSystem) {
          const result = await this.hooks.mutate(
            tableName,
            "delete",
            async (query) =>
              this.queryHandler
                .buildQuery(queryParams, query)
                .del(["id"], { includeTriggerModifications: true }),
            undefined,
            queryParams,
            trx,
          );
          return {
            data: result,
            status: true,
          };
        }

        if (!user && !isSystem && this.config.enforceRls) {
          return {
            status: false,
            message: "Authentication required to delete records",
          };
        }

        const {
          status: initialStatus,
          hasFieldCheck: initialHasFieldCheck,
          hasCustomFunction: initialHasCustomFunction,
        } = await enforcePermissions(
          tableName,
          "DELETE",
          user as UserContext,
          this.permissionService,
          undefined,
          this.hooks.getKnexInstance(),
        );

        if (
          !initialStatus &&
          !initialHasFieldCheck &&
          !initialHasCustomFunction
        ) {
          return {
            status: false,
            message: "User does not have permission to delete this records",
          };
        }

        if (initialStatus) {
          // If the user has permission to delete, proceed with the deletion
          const result = await this.hooks.mutate(
            tableName,
            "delete",
            async (query) =>
              this.queryHandler
                .buildQuery(queryParams, query)
                .del(["id"], { includeTriggerModifications: true }),
            undefined,
            queryParams,
            trx,
          );
          return {
            data: result,
            status: true,
          };
        }

        // get the record to enforce permissions
        const records = await this.hooks.query(
          tableName,
          async (query) => this.queryHandler.buildQuery(queryParams, query),
          queryParams,
          trx,
        );

        const { status } = await enforcePermissions(
          tableName,
          "DELETE",
          user as UserContext,
          this.permissionService,
          records,
          this.hooks.getKnexInstance(),
        );
        if (!status) {
          return {
            status: false,
            message: "User does not have permission to delete this records",
          };
        }

        const result = await this.hooks.mutate(
          tableName,
          "delete",
          async (query) =>
            this.queryHandler
              .buildQuery(queryParams, query)
              .del(["id"], { includeTriggerModifications: true }),
          undefined,
          queryParams,
          trx,
        );

        return {
          data: result,
          status: true,
        };
      },
    },

    /**
     * Work with the database permissions
     * @returns Permissions endpoints
     */
    permissions: {
      get: async (params: PermissionParams, trx?: Knex.Transaction) => {
        if (this.excludedTables.includes(params.tableName)) {
          return {
            status: false,
            message: `Table ${params.tableName} is excluded from operations`,
          };
        }
        // If no transaction is provided, create one internally
        if (!trx) {
          return this.transaction(async (newTrx) => {
            return await this.endpoints.permissions.get(params, newTrx);
          });
        }

        const { tableName } = params;
        const permissions = await this.permissionService.getPermissionsForTable(
          tableName,
          trx,
        );

        return {
          permissions,
          status: true,
        };
      },

      set: async (params: PermissionParams, trx?: Knex.Transaction) => {
        if (this.excludedTables.includes(params.tableName)) {
          return {
            status: false,
            message: `Table ${params.tableName} is excluded from operations`,
          };
        }
        // If no transaction is provided, create one internally and manage it
        if (!trx) {
          return this.transaction(async (newTrx) => {
            return await this.endpoints.permissions.set(params, newTrx);
          });
        }

        const { tableName, permissions } = params;

        if (!permissions) {
          return {
            status: false,
            message: "Permissions object is required",
          };
        }

        const result = await this.permissionService.setPermissionsForTable(
          tableName,
          permissions,
          trx,
        );

        return {
          permission: result,
          status: true,
        };
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
            queryParams[key] = Number.parseInt(value, 10) || 10;
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
