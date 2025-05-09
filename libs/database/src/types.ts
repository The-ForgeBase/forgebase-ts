/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Knex } from 'knex';
import type { KnexHooks } from './knex-hooks';
import type { PermissionService } from './permissionService';
import type { DatabaseSchema, TableInfo } from './utils/inspector';
import { QueryParams } from './sdk/server';

export const FG_PERMISSION_TABLE = 'fg_table_permissions';

// Column definition for schema operations
export type ColumnType =
  | 'increments'
  | 'string'
  | 'text'
  | 'integer'
  | 'bigInteger'
  | 'boolean'
  | 'decimal'
  | 'float'
  | 'datetime'
  | 'date'
  | 'time'
  | 'timestamp'
  | 'binary'
  | 'json'
  | 'jsonb'
  | 'enum'
  | 'uuid';

export interface ColumnDefinition {
  name: string;
  type: ColumnType;
  primary?: boolean;
  unique?: boolean;
  nullable: boolean;
  enumValues?: string[];
  foreignKeys?: ForeignKey;
  default?: any;
}

export interface UpdateColumnDefinition {
  currentName: string;
  newName?: string;
  type?: ColumnType;
  currentType: ColumnType; // Added this to know the current column type
  primary?: boolean;
  unique?: boolean;
  nullable?: boolean;
  foreignKeys?: ForeignKey;
  default?: any;
}

export interface ForeignKey {
  columnName: string;
  references: {
    tableName: string;
    columnName: string;
  };
}

export type CustomRlsFunction = (
  userContext: UserContext,
  row: Record<string, unknown>,
  knex?: Knex
) => Promise<boolean> | boolean;

export type PermissionRule = {
  allow:
    | 'public'
    | 'private'
    | 'role'
    | 'auth'
    | 'guest'
    | 'labels'
    | 'teams'
    | 'static'
    | 'fieldCheck'
    | 'customSql'
    | 'customFunction';
  labels?: string[]; // Array of required labels
  teams?: string[]; // Array of required teams
  static?: boolean; // Static true/false value
  customSql?: string; // Custom SQL condition (full SQL)
  customFunction?: string; // Name of registered custom function
  fieldCheck?: FieldCheck; // Field-based rules
  roles?: string[];
};

export type UserContextFields = keyof UserContext;

export type FieldCheck = {
  field: string; // Field to check on the row/data being fetched or mutated
  operator: '===' | '!==' | 'in' | 'notIn'; // Comparison operators
  valueType: 'userContext' | 'static'; // Whether to compare against userContext or a static value
  value: UserContextFields | any[]; // Updated to use UserContextFields when valueType is "userContext"
};

export type UserContext = {
  userId: number | string;
  labels: string[];
  teams: string[];
  permissions?: string[]; // Optional explicit permissions
  role?: string;
};

export type TablePermissions = {
  operations: {
    SELECT?: PermissionRule[];
    INSERT?: PermissionRule[];
    UPDATE?: PermissionRule[];
    DELETE?: PermissionRule[];
  };
};

/**
 * Type of realtime adapter to use for database table broadcasts
 */
export type RealtimeAdapterType = 'websocket' | 'sse';

export interface ForgeDatabaseConfig {
  db?: Knex;
  hooks?: KnexHooks;
  permissionsService?: PermissionService;
  prefix?: string;
  enforceRls?: boolean;
  realtime?: boolean;
  /** Type of realtime adapter to use (default: 'websocket') */
  realtimeAdapter?: RealtimeAdapterType;
  defaultPermissions?: TablePermissions;
  excludedTables?: string[];
  websocketPort?: number;
  /** Whether to automatically initialize permissions for all tables (default: false) */
  initializePermissions?: boolean;
  /** Path where the permission initialization report will be saved */
  permissionReportPath?: string;
  /** Callback function to be called when permission initialization is complete */
  onPermissionInitComplete?: (report: PermissionInitializationReport) => void;
}

// Handler types
export type EndpointHandler = (request: Request) => Promise<any>;
export type SchemaHandler = (request: Request) => Promise<any>;
export type PermissionHandler = (request: Request) => Promise<any>;
export type DataHandler = (request: Request) => Promise<any>;

// Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status?: number;
}

export interface SchemaCreateParams {
  tableName: string;
  columns: ColumnDefinition[];
}

export interface AddForeignKeyParams {
  tableName: string;
  column: string;
  foreignTableName: string;
  foreignColumn: string;
}

export interface DropForeignKeyParams {
  tableName: string;
  column: string;
}

export interface ModifySchemaParams {
  tableName: string;
  action: 'addColumn' | 'deleteColumn' | 'updateColumn';
  columns: ColumnDefinition[] | UpdateColumnDefinition[];
}

export type DataQueryParams = QueryParams;

export interface DataMutationParams {
  tableName: string;
  data: Record<string, any> | Array<Record<string, any>>;
  id?: string | number;
}

export interface AdvanceDataMutationParams {
  tableName: string;
  data: Record<string, any> | Array<Record<string, any>>;
  query: DataQueryParams;
}

export interface DataDeleteParams {
  tableName: string;
  id: string | number;
}

export interface AdvanceDataDeleteParams {
  tableName: string;
  query: DataQueryParams;
}

export interface PermissionParams {
  tableName: string;
  permissions?: TablePermissions;
}

/**
 * Report generated after permission initialization
 */
export interface PermissionInitializationReport {
  /** Timestamp when the initialization started */
  startTime: Date;
  /** Timestamp when the initialization completed */
  endTime: Date;
  /** Total number of tables processed */
  totalTables: number;
  /** Number of tables that already had permissions */
  tablesWithPermissions: number;
  /** Number of tables that had permissions initialized */
  tablesInitialized: number;
  /** Number of tables excluded from initialization */
  tablesExcluded: number;
  /** List of tables that had permissions initialized */
  initializedTables: string[];
  /** List of tables that already had permissions */
  existingPermissionTables: string[];
  /** List of tables that were excluded */
  excludedTables: string[];
  /** Any errors that occurred during initialization */
  errors: Array<{ table: string; error: string }>;
}

export interface ForgeDatabaseEndpoints {
  schema: {
    get: () => Promise<DatabaseSchema>;
    create: (
      params: SchemaCreateParams,
      trx?: Knex.Transaction
    ) => Promise<{
      message: string;
      tablename: string;
      action: string;
    }>;
    delete: (
      tableName: string,
      trx?: Knex.Transaction
    ) => Promise<{
      message: string;
      tablename: string;
      action: string;
    }>;
    modify: (
      params: ModifySchemaParams,
      trx?: Knex.Transaction
    ) => Promise<any>;
    addForeingKey: (
      params: AddForeignKeyParams,
      trx?: Knex.Transaction
    ) => Promise<any>;
    dropForeignKey: (
      params: DropForeignKeyParams,
      trx?: Knex.Transaction
    ) => Promise<any>;
    truncateTable: (tableName: string, trx?: Knex.Transaction) => Promise<any>;
    getTables: () => Promise<string[]>;
    getTableSchema: (tableName: string) => Promise<{
      name: string;
      info: TableInfo;
    }>;
    getTablePermissions: (
      tableName: string,
      trx?: Knex.Transaction
    ) => Promise<TablePermissions>;
    getTableSchemaWithPermissions: (
      tableName: string,
      trx?: Knex.Transaction
    ) => Promise<{
      name: string;
      info: TableInfo;
      permissions: TablePermissions;
    }>;
  };
  data: {
    query: <T>(
      tableName: string,
      params: DataQueryParams,
      user?: UserContext,
      isSystem?: boolean,
      trx?: Knex.Transaction
    ) => Promise<T[]>;
    create: (
      params: DataMutationParams,
      user?: UserContext,
      isSystem?: boolean,
      trx?: Knex.Transaction
    ) => Promise<any>;
    update: (
      params: DataMutationParams,
      user?: UserContext,
      isSystem?: boolean,
      trx?: Knex.Transaction
    ) => Promise<any>;
    advanceUpdate: (
      params: AdvanceDataMutationParams,
      user?: UserContext,
      isSystem?: boolean,
      trx?: Knex.Transaction
    ) => Promise<any>;
    delete: (
      params: DataDeleteParams,
      user?: UserContext,
      isSystem?: boolean,
      trx?: Knex.Transaction
    ) => Promise<any>;
    advanceDelete: (
      params: AdvanceDataDeleteParams,
      user?: UserContext,
      isSystem?: boolean,
      trx?: Knex.Transaction
    ) => Promise<any>;
  };
  permissions: {
    get: (
      params: PermissionParams,
      trx?: Knex.Transaction
    ) => Promise<TablePermissions | undefined>;
    set: (params: PermissionParams, trx?: Knex.Transaction) => Promise<any>;
  };
}
