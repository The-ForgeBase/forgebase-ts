import { Kysely, type Transaction, type CreateTableBuilder } from 'kysely';
import { PermissionService } from './permissionService';
import { enforcePermissions, evaluateFieldCheckForRow } from './rlsManager';
import { DBInspector, type DatabaseSchema } from './utils/inspector';
import { KyselyHooks } from './kysely-hooks';
import {
  AuthenticationRequiredError,
  ExcludedTableError,
  PermissionDeniedError,
} from './errors';
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
} from './types';
import type {
  AdvanceDataDeleteParams,
  AdvanceDataMutationParams,
  UserContext,
  Row,
} from './types';
import { createColumn } from './utils/column-utils';
import {
  addForeignKey,
  dropForeignKey,
  modifySchema,
  truncateTable,
} from './schema';
import { KyselyQueryHandler } from './sdk/server';
import { WebSocketManager } from './websocket/WebSocketManager';
import { SSEManager } from './websocket/SSEManager';
import { RealtimeAdapter } from './websocket/RealtimeAdapter';
import { initializePermissions } from './utils/permission-initializer';

import { LibsqlDialect } from './libsql';

export class ForgeDatabase {
  private queryHandler: KyselyQueryHandler;
  private hooks: KyselyHooks;
  private permissionService: PermissionService;
  protected dbInspector: DBInspector;
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
  public realtimeAdapter?: RealtimeAdapter;
  protected excludedTables: string[] = [FG_PERMISSION_TABLE];

  constructor(private config: ForgeDatabaseConfig = {}) {
    if (!config.db && !config.libsql) {
      throw new Error(
        'Either database instance (db) or libsql config is required',
      );
    }

    if (!config.db && config.libsql) {
      this.config.db = new Kysely({
        dialect: new LibsqlDialect(config.libsql),
      });
    }

    if (config.excludedTables) {
      this.excludedTables = [...this.excludedTables, ...config.excludedTables];
    }

    this.permissionService =
      config.permissionsService || new PermissionService(config.db);
    this.dbInspector = new DBInspector(config.db);

    // Initialize realtime adapter if realtime is enabled
    if (config.realtime) {
      const adapterType = config.realtimeAdapter || 'sse';
      const port = config.websocketPort || 9001;

      if (adapterType === 'websocket') {
        this.realtimeAdapter = new WebSocketManager(
          port,
          this.permissionService,
        );
      } else if (adapterType === 'sse') {
        this.realtimeAdapter = new SSEManager(port, this.permissionService);
      }
    }
    this.hooks =
      config.hooks || new KyselyHooks(config.db, this.realtimeAdapter);
    this.queryHandler = new KyselyQueryHandler(this.hooks.getDbInstance());

    // Set default permissions for all tables
    if (config.defaultPermissions) {
      this.defaultPermissions = config.defaultPermissions;
    }

    // Initialize permissions for all tables if enabled
    if (config.initializePermissions) {
      this.initializeTablePermissions();
    }
  }

  public getDbInspector(): DBInspector {
    return this.dbInspector;
  }

  public async ready(): Promise<void> {
    await this.permissionService.ready();
  }

  public getExcludedTables(): string[] {
    return this.excludedTables;
  }

  getDefaultPermissions(): TablePermissions {
    return this.defaultPermissions;
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
      this.hooks.getDbInstance(),
      this.permissionService,
      this.dbInspector,
      this.excludedTables,
      this.defaultPermissions,
      finalReportPath,
      finalCallback,
    );

    console.log('Permission initialization started in the background');
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
  public getDbInstance(): Kysely<any> {
    return this.hooks.getDbInstance();
  }

  public getHooksDb(): KyselyHooks {
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
    callback: (trx: Transaction<any>) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.hooks.getDbInstance().transaction().execute(callback);
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
      get: async (trx?: Transaction<any>): Promise<DatabaseSchema> => {
        return await this.dbInspector.getDatabaseSchema(this.excludedTables);
      },
      create: async (payload: SchemaCreateParams, trx?: Transaction<any>) => {
        const { tableName, columns } = payload;

        if (!tableName) {
          throw new Error('Invalid request body');
        }

        // Efficiently check if table exists
        const hasTable = await this.dbInspector.hasTable(tableName);

        if (hasTable) {
          console.log('Table already exists');
          throw new Error('Table already exists');
        }

        // Use transaction if provided, otherwise use the db instance
        const builder = trx || this.hooks.getDbInstance();

        // Start creating the table
        // Start creating the table
        let tableBuilder = builder.schema.createTable(tableName);

        // Add columns using strict createColumn util
        columns.forEach((col: any) => {
          tableBuilder = createColumn(
            tableBuilder,
            col,
            this.hooks.getDbInstance(),
          ) as CreateTableBuilder<any, any>;
        });

        await tableBuilder.execute();

        await this.permissionService.setPermissionsForTable(
          tableName,
          this.defaultPermissions,
          builder,
        );
        return {
          message: 'Table created successfully',
          tablename: tableName,
          action: 'create',
        };
      },
      delete: async (tableName: string, trx?: Transaction<any>) => {
        if (this.excludedTables.includes(tableName)) {
          throw new ExcludedTableError(tableName);
        }
        // Use transaction if provided, otherwise use the db instance
        const builder = trx || this.hooks.getDbInstance();
        await builder.schema.dropTable(tableName).ifExists().execute();

        await this.permissionService.deletePermissionsForTable(
          tableName,
          builder,
        );

        return {
          message: 'Table deleted successfully',
          tablename: tableName,
          action: 'delete',
        };
      },
      modify: async (payload: ModifySchemaParams, trx?: Transaction<any>) => {
        if (this.excludedTables.includes(payload.tableName)) {
          throw new ExcludedTableError(payload.tableName);
        }
        const builder = this.hooks.getDbInstance();
        return await modifySchema(builder, payload, trx);
      },
      addForeingKey: async (
        payload: AddForeignKeyParams,
        trx?: Transaction<any>,
      ) => {
        if (this.excludedTables.includes(payload.tableName)) {
          throw new ExcludedTableError(payload.tableName);
        }

        if (this.excludedTables.includes(payload.foreignTableName)) {
          throw new ExcludedTableError(payload.foreignTableName);
        }

        return await addForeignKey(payload, this.hooks.getDbInstance(), trx);
      },
      dropForeignKey: async (
        payload: DropForeignKeyParams,
        trx?: Transaction<any>,
      ) => {
        if (this.excludedTables.includes(payload.tableName)) {
          throw new ExcludedTableError(payload.tableName);
        }

        return await dropForeignKey(payload, this.hooks.getDbInstance(), trx);
      },
      truncateTable: async (tableName: string, trx?: Transaction<any>) => {
        if (this.excludedTables.includes(tableName)) {
          throw new ExcludedTableError(tableName);
        }

        return await truncateTable(tableName, this.hooks.getDbInstance(), trx);
      },
      getTableSchema: async (tableName: string, trx?: Transaction<any>) => {
        if (this.excludedTables.includes(tableName)) {
          throw new ExcludedTableError(tableName);
        }
        const tableInfo = await this.dbInspector.getTableInfo(tableName);
        return {
          name: tableName,
          info: tableInfo,
        };
      },
      getTables: async (trx?: Transaction<any>) => {
        let tables = await this.dbInspector.getTables();
        tables = tables.filter((t) => !this.excludedTables.includes(t));
        return tables;
      },
      getTablePermissions: async (
        tableName: string,
        trx?: Transaction<any>,
      ) => {
        if (this.excludedTables.includes(tableName)) {
          throw new ExcludedTableError(tableName);
        }

        return await this.permissionService.getPermissionsForTable(
          tableName,
          trx,
        );
      },
      getTableSchemaWithPermissions: async (
        tableName: string,
        trx?: Transaction<any>,
      ) => {
        if (this.excludedTables.includes(tableName)) {
          throw new ExcludedTableError(tableName);
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
        trx?: Transaction<any>,
      ) => {
        if (this.excludedTables.includes(tableName)) {
          throw new ExcludedTableError(tableName);
        }

        // const queryParams = this.parseQueryParams(params);
        const queryParams = params; // KyselyQueryHandler handles params object directly

        if (!this.config.enforceRls || isSystem) {
          return this.hooks.query(
            tableName,
            (db) =>
              this.queryHandler
                .buildQuery(queryParams, db.selectFrom(tableName))
                .execute(),
            queryParams,
            trx,
          );
        }

        if (!user && !isSystem && this.config.enforceRls) {
          throw new AuthenticationRequiredError(
            'Authentication required to query records',
          );
        }

        const {
          status: initialStatus,
          hasFieldCheck: initialHasFieldCheck,
          hasCustomFunction: initialHasCustomFunction,
          fieldCheckRules: extractedFieldCheckRules,
        } = await enforcePermissions(
          tableName,
          'SELECT',
          user as UserContext,
          this.permissionService,
          undefined,
          this.hooks.getDbInstance(),
        );

        if (
          !initialStatus &&
          !initialHasFieldCheck &&
          !initialHasCustomFunction
        ) {
          throw new PermissionDeniedError(
            `User does not have permission to query table "${tableName}"`,
          );
        }

        const records = (await this.hooks.query(
          tableName,
          (db) =>
            this.queryHandler
              .buildQuery(queryParams, db.selectFrom(tableName))
              .execute(),
          queryParams,
          trx,
        )) as Row[];

        if (initialStatus) {
          // Simple rule matched — return all records
          return records;
        }

        // Fast path: filter rows using pre-extracted fieldCheck rules
        if (extractedFieldCheckRules?.length) {
          const filtered: Row[] = [];
          for (const record of records) {
            const allowed = await evaluateFieldCheckForRow(
              extractedFieldCheckRules,
              user as UserContext,
              record as Record<string, unknown>,
              this.hooks.getDbInstance(),
            );
            if (allowed) {
              filtered.push(record);
            }
          }

          return filtered as any;
        }

        // Fallback for customFunction rules
        const { status, row } = await enforcePermissions(
          tableName,
          'SELECT',
          user as UserContext,
          this.permissionService,
          records,
          this.hooks.getDbInstance(),
        );

        if (!status) {
          throw new PermissionDeniedError(
            `User does not have permission to query table "${tableName}"`,
          );
        }

        return row as any;
      },

      create: async (
        params: DataMutationParams,
        user?: UserContext,
        isSystem = false,
        trx?: Transaction<any>,
      ) => {
        if (this.excludedTables.includes(params.tableName)) {
          throw new ExcludedTableError(params.tableName);
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
              typeof record === 'object' && Object.keys(record).length > 0,
          )
        ) {
          console.log('Invalid request body', records);
          throw new Error('Invalid request body');
        }

        if (!this.config.enforceRls || isSystem) {
          return this.hooks.mutate(
            tableName,
            'create',
            async (db) =>
              db.insertInto(tableName).values(records).returningAll().execute(),
            records,
            undefined,
            trx,
          );
        }

        if (!user && !isSystem && this.config.enforceRls) {
          throw new AuthenticationRequiredError(
            'Authentication required to create records',
          );
        }

        const {
          status: initialStatus,
          hasFieldCheck: initialHasFieldCheck,
          hasCustomFunction: initialHasCustomFunction,
        } = await enforcePermissions(
          tableName,
          'INSERT',
          user as UserContext,
          this.permissionService,
          undefined,
          this.hooks.getDbInstance(),
        );

        if (
          !initialStatus &&
          !initialHasFieldCheck &&
          !initialHasCustomFunction
        ) {
          throw new PermissionDeniedError(
            `User does not have permission to create record in table "${tableName}"`,
          );
        }

        if (initialStatus) {
          // If the user has permission to create, proceed with the creation
          return this.hooks.mutate(
            tableName,
            'create',
            async (db) =>
              db.insertInto(tableName).values(records).returningAll().execute(),
            records,
            undefined,
            trx,
          );
        }

        const { status, row } = await enforcePermissions(
          tableName,
          'INSERT',
          user as UserContext,
          this.permissionService,
          records,
          this.hooks.getDbInstance(),
        );

        if (!status) {
          throw new Error(
            `User does not have permission to create record in table "${tableName}"`,
          );
        }

        if (!row || (Array.isArray(row) && row.length === 0)) {
          throw new PermissionDeniedError(
            `User does not have permission to create this record in table "${tableName}"`,
          );
        }

        const result = this.hooks.mutate(
          tableName,
          'create',
          async (db) =>
            db.insertInto(tableName).values(row).returningAll().execute(),
          row,
          undefined,
          trx,
        );

        return result;
      },

      update: async (
        params: DataMutationParams,
        user?: UserContext,
        isSystem = false,
        trx?: Transaction<any>,
      ) => {
        if (this.excludedTables.includes(params.tableName)) {
          throw new ExcludedTableError(params.tableName);
        }

        const { id, tableName, data } = params;

        if (!this.config.enforceRls || isSystem) {
          const result = this.hooks.mutate(
            tableName,
            'update',
            async (db) =>
              db
                .updateTable(tableName)
                .set(data)
                .where('id', '=', id)
                .returningAll()
                .execute(),
            { id, ...data },
            undefined,
            trx,
          );

          return result;
        }

        if (!user && !isSystem && this.config.enforceRls) {
          throw new AuthenticationRequiredError(
            'Authentication required to update records',
          );
        }

        const {
          status: initialStatus,
          hasFieldCheck: initialHasFieldCheck,
          hasCustomFunction: initialHasCustomFunction,
          fieldCheckRules: extractedFieldCheckRules,
        } = await enforcePermissions(
          tableName,
          'UPDATE',
          user as UserContext,
          this.permissionService,
          undefined,
          this.hooks.getDbInstance(),
        );

        if (
          !initialStatus &&
          !initialHasFieldCheck &&
          !initialHasCustomFunction
        ) {
          throw new Error(
            `User does not have permission to update record with id ${id}`,
          );
        }

        if (initialStatus) {
          // Simple rule matched — proceed directly
          const result = this.hooks.mutate(
            tableName,
            'update',
            async (db) =>
              db
                .updateTable(tableName)
                .set(data)
                .where('id', '=', id)
                .returningAll()
                .execute(),
            { id, ...data },
            undefined,
            trx,
          );

          return result;
        }

        // fieldCheck/customFunction path — fetch the row then evaluate
        const record = await this.hooks.query(
          tableName,
          (db) => {
            return db
              .selectFrom(tableName)
              .where('id', '=', id)
              .selectAll()
              .execute();
          },
          { id },
          trx,
        );

        // Fast path: use pre-extracted rules instead of full enforcePermissions
        if (extractedFieldCheckRules?.length) {
          const allowed = await evaluateFieldCheckForRow(
            extractedFieldCheckRules,
            user as UserContext,
            record[0] as Record<string, unknown>,
            this.hooks.getDbInstance(),
          );

          if (!allowed) {
            throw new PermissionDeniedError(
              `User does not have permission to update record with id ${id}`,
            );
          }
        } else {
          // Fallback for customFunction rules
          const { status } = await enforcePermissions(
            tableName,
            'UPDATE',
            user as UserContext,
            this.permissionService,
            record[0],
            this.hooks.getDbInstance(),
          );

          if (!status) {
            throw new PermissionDeniedError(
              `User does not have permission to update record with id ${id}`,
            );
          }
        }

        const result = this.hooks.mutate(
          tableName,
          'update',
          async (db) =>
            db
              .updateTable(tableName)
              .set(data)
              .where('id', '=', id)
              .returningAll()
              .execute(),
          { id, ...data },
          undefined,
          trx,
        );

        return result;
      },

      advanceUpdate: async (
        params: AdvanceDataMutationParams,
        user?: UserContext,
        isSystem = false,
        trx?: Transaction<any>,
      ) => {
        if (this.excludedTables.includes(params.tableName)) {
          throw new ExcludedTableError(params.tableName);
        }

        const { query, tableName, data } = params;

        // const queryParams = this.parseQueryParams(query);
        const queryParams = query;

        if (!this.config.enforceRls || isSystem) {
          const result = this.hooks.mutate(
            tableName,
            'update',
            async (db) =>
              this.queryHandler
                .buildQuery(queryParams, db.updateTable(tableName))
                .set(data)
                .returningAll()
                .execute(),
            { ...data },
            undefined,
            trx,
          );

          return result;
        }

        if (!user && !isSystem && this.config.enforceRls) {
          throw new AuthenticationRequiredError(
            'Authentication required to update records',
          );
        }

        const {
          status: initialStatus,
          hasFieldCheck: initialHasFieldCheck,
          hasCustomFunction: initialHasCustomFunction,
          fieldCheckRules: extractedFieldCheckRules,
        } = await enforcePermissions(
          tableName,
          'UPDATE',
          user as UserContext,
          this.permissionService,
          undefined,
          this.hooks.getDbInstance(),
        );

        if (
          !initialStatus &&
          !initialHasFieldCheck &&
          !initialHasCustomFunction
        ) {
          throw new Error(
            `User does not have permission to update this records`,
          );
        }

        if (initialStatus) {
          // Simple rule matched — proceed directly
          const result = this.hooks.mutate(
            tableName,
            'update',
            async (db) =>
              this.queryHandler
                .buildQuery(queryParams, db.updateTable(tableName))
                .set(data)
                .returningAll()
                .execute(),
            { ...data },
            queryParams,
            trx,
          );

          return result;
        }

        // fieldCheck/customFunction path — fetch matching rows then evaluate
        const records = (await this.hooks.query(
          tableName,
          (db) =>
            this.queryHandler
              .buildQuery(queryParams, db.selectFrom(tableName))
              .selectAll()
              .execute(),
          queryParams,
          trx,
        )) as Row[];

        // Fast path: use pre-extracted rules instead of full enforcePermissions
        if (extractedFieldCheckRules?.length) {
          for (const record of records) {
            const allowed = await evaluateFieldCheckForRow(
              extractedFieldCheckRules,
              user as UserContext,
              record as Record<string, unknown>,
              this.hooks.getDbInstance(),
            );
            if (!allowed) {
              throw new PermissionDeniedError(
                `User does not have permission to update this records`,
              );
            }
          }
        } else {
          // Fallback for customFunction rules
          const { status } = await enforcePermissions(
            tableName,
            'UPDATE',
            user as UserContext,
            this.permissionService,
            records,
            this.hooks.getDbInstance(),
          );

          if (!status) {
            throw new PermissionDeniedError(
              `User does not have permission to update this records`,
            );
          }
        }

        const result = this.hooks.mutate(
          tableName,
          'update',
          async (db) =>
            this.queryHandler
              .buildQuery(queryParams, db.updateTable(tableName))
              .set(data)
              .returningAll()
              .execute(),
          { ...data },
          queryParams,
          trx,
        );

        return result;
      },

      delete: async (
        params: DataDeleteParams,
        user?: UserContext,
        isSystem = false,
        trx?: Transaction<any>,
      ) => {
        if (this.excludedTables.includes(params.tableName)) {
          throw new ExcludedTableError(params.tableName);
        }

        const { id, tableName } = params;

        if (!this.config.enforceRls || isSystem) {
          return this.hooks.mutate(
            tableName,
            'delete',
            async (db) =>
              db
                .deleteFrom(tableName)
                .where('id', '=', id)
                .returning('id')
                .execute(),
            { id },
            undefined,
            trx,
          );
        }

        if (!user && !isSystem && this.config.enforceRls) {
          throw new AuthenticationRequiredError(
            'Authentication required to delete records',
          );
        }

        const {
          status: initialStatus,
          hasFieldCheck: initialHasFieldCheck,
          hasCustomFunction: initialHasCustomFunction,
          fieldCheckRules: extractedFieldCheckRules,
        } = await enforcePermissions(
          tableName,
          'DELETE',
          user as UserContext,
          this.permissionService,
          undefined,
          this.hooks.getDbInstance(),
        );

        if (
          !initialStatus &&
          !initialHasFieldCheck &&
          !initialHasCustomFunction
        ) {
          throw new PermissionDeniedError(
            `User does not have permission to delete record with id ${id}`,
          );
        }

        if (initialStatus) {
          // If the user has permission to delete, proceed with the deletion
          return this.hooks.mutate(
            tableName,
            'delete',
            async (db) =>
              db.deleteFrom(tableName).where('id', '=', id).execute(),
            { id },
            undefined,
            trx,
          );
        }

        // fieldCheck/customFunction path — fetch the record then evaluate
        const record = (await this.hooks.query(
          tableName,
          (db) => {
            return db
              .selectFrom(tableName)
              .where('id', '=', id)
              .selectAll()
              .execute();
          },
          { id },
          trx,
        )) as Row[];

        // Fast path: use pre-extracted rules instead of full enforcePermissions
        if (extractedFieldCheckRules?.length) {
          const allowed = await evaluateFieldCheckForRow(
            extractedFieldCheckRules,
            user as UserContext,
            record[0] as Record<string, unknown>,
            this.hooks.getDbInstance(),
          );

          if (!allowed) {
            throw new PermissionDeniedError(
              `User does not have permission to delete record with id ${id}`,
            );
          }
        } else {
          // Fallback for customFunction rules
          const { status } = await enforcePermissions(
            tableName,
            'DELETE',
            user as UserContext,
            this.permissionService,
            record,
            this.hooks.getDbInstance(),
          );
          if (!status) {
            throw new PermissionDeniedError(
              `User does not have permission to delete record with id ${id}`,
            );
          }
        }

        return this.hooks.mutate(
          tableName,
          'delete',
          async (db) => db.deleteFrom(tableName).where('id', '=', id).execute(),
          { id },
          undefined,
          trx,
        );
      },

      advanceDelete: async (
        params: AdvanceDataDeleteParams,
        user?: UserContext,
        isSystem = false,
        trx?: Transaction<any>,
      ) => {
        if (this.excludedTables.includes(params.tableName)) {
          throw new ExcludedTableError(params.tableName);
        }

        const { query, tableName } = params;

        // const queryParams = this.parseQueryParams(query);
        const queryParams = query;

        if (!this.config.enforceRls || isSystem) {
          return this.hooks.mutate(
            tableName,
            'delete',
            async (db) =>
              this.queryHandler
                .buildQuery(queryParams, db.deleteFrom(tableName))
                .returningAll()
                .execute(),
            undefined,
            queryParams,
            trx,
          );
        }

        if (!user && !isSystem && this.config.enforceRls) {
          throw new AuthenticationRequiredError(
            'Authentication required to delete records',
          );
        }

        const {
          status: initialStatus,
          hasFieldCheck: initialHasFieldCheck,
          hasCustomFunction: initialHasCustomFunction,
          fieldCheckRules: extractedFieldCheckRules,
        } = await enforcePermissions(
          tableName,
          'DELETE',
          user as UserContext,
          this.permissionService,
          undefined,
          this.hooks.getDbInstance(),
        );

        if (
          !initialStatus &&
          !initialHasFieldCheck &&
          !initialHasCustomFunction
        ) {
          throw new PermissionDeniedError(
            `User does not have permission to delete this records`,
          );
        }

        if (initialStatus) {
          // Simple rule matched — proceed directly
          return this.hooks.mutate(
            tableName,
            'delete',
            async (db) =>
              this.queryHandler
                .buildQuery(queryParams, db.deleteFrom(tableName))
                .returningAll()
                .execute(),
            undefined,
            queryParams,
            trx,
          );
        }

        // fieldCheck/customFunction path — fetch matching rows then evaluate
        const records = (await this.hooks.query(
          tableName,
          async (db) =>
            this.queryHandler
              .buildQuery(queryParams, db.selectFrom(tableName))
              .execute(),
          queryParams,
          trx,
        )) as Row[];

        // Fast path: use pre-extracted rules instead of full enforcePermissions
        if (extractedFieldCheckRules?.length) {
          for (const record of records) {
            const allowed = await evaluateFieldCheckForRow(
              extractedFieldCheckRules,
              user as UserContext,
              record as Record<string, unknown>,
              this.hooks.getDbInstance(),
            );
            if (!allowed) {
              throw new PermissionDeniedError(
                `User does not have permission to delete this records`,
              );
            }
          }
        } else {
          // Fallback for customFunction rules
          const { status } = await enforcePermissions(
            tableName,
            'DELETE',
            user as UserContext,
            this.permissionService,
            records,
            this.hooks.getDbInstance(),
          );
          if (!status) {
            throw new PermissionDeniedError(
              `User does not have permission to delete this records`,
            );
          }
        }

        return this.hooks.mutate(
          tableName,
          'delete',
          async (db) =>
            this.queryHandler
              .buildQuery(queryParams, db.deleteFrom(tableName))
              .returningAll()
              .execute(),
          undefined,
          queryParams,
          trx,
        );
      },
    },

    /**
     * Work with the database permissions
     * @returns Permissions endpoints
     */
    permissions: {
      get: async (params: PermissionParams, trx?: Transaction<any>) => {
        if (this.excludedTables.includes(params.tableName)) {
          throw new ExcludedTableError(params.tableName);
        }
        // If no transaction is provided, create one internally
        if (!trx) {
          return this.transaction(async (newTrx) => {
            return await this.endpoints.permissions.get(params, newTrx);
          });
        }

        const { tableName } = params;
        return this.permissionService.getPermissionsForTable(tableName, trx);
      },

      set: async (params: PermissionParams, trx?: Transaction<any>) => {
        if (this.excludedTables.includes(params.tableName)) {
          throw new ExcludedTableError(params.tableName);
        }
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
          trx,
        );
      },
    },
  };

  parseQueryParams(params: Record<string, any>): Record<string, any> {
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
