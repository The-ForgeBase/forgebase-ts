/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Knex } from 'knex';
import type { KnexHooks } from './knex-hooks';
import type { PermissionService } from './permissionService';
import type { DatabaseSchema, TableInfo } from './utils/inspector';
import { QueryParams } from './sdk/server';

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
    | 'customSql';
  labels?: string[]; // Array of required labels
  teams?: string[]; // Array of required teams
  static?: boolean; // Static true/false value
  customSql?: string; // Custom SQL condition (full SQL)
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

export interface ForgeDatabaseConfig {
  db?: Knex;
  hooks?: KnexHooks;
  permissions?: PermissionService;
  prefix?: string;
  enforceRls?: boolean;
  realtime?: boolean;
  defaultPermissions?: TablePermissions;
  validTables?: string[];
  checkValidTable?: boolean;
  websocketPort?: number;
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

export interface DataDeleteParams {
  tableName: string;
  id: string | number;
}

export interface PermissionParams {
  tableName: string;
  permissions?: TablePermissions;
}

export interface ForgeDatabaseEndpoints {
  schema: {
    get: () => Promise<DatabaseSchema>;
    create: (params: SchemaCreateParams) => Promise<{
      message: string;
      tablename: string;
      action: string;
    }>;
    delete: (tableName: string) => Promise<{
      message: string;
      tablename: string;
      action: string;
    }>;
    modify: (params: ModifySchemaParams) => Promise<any>;
    addForeingKey: (params: AddForeignKeyParams) => Promise<any>;
    dropForeignKey: (params: DropForeignKeyParams) => Promise<any>;
    truncateTable: (tableName: string) => Promise<any>;
    getTables: () => Promise<string[]>;
    getTableSchema: (tableName: string) => Promise<{
      name: string;
      info: TableInfo;
    }>;
    getTablePermissions: (tableName: string) => Promise<TablePermissions>;
    getTableSchemaWithPermissions: (tableName: string) => Promise<{
      name: string;
      info: TableInfo;
      permissions: TablePermissions;
    }>;
  };
  data: {
    query: <T>(
      tableName: string,
      params: DataQueryParams,
      user?: UserContext
    ) => Promise<T[]>;
    create: (params: DataMutationParams, user?: UserContext) => Promise<any>;
    update: (params: DataMutationParams, user?: UserContext) => Promise<any>;
    delete: (params: DataDeleteParams, user?: UserContext) => Promise<any>;
  };
  permissions: {
    get: (params: PermissionParams) => Promise<TablePermissions | undefined>;
    set: (params: PermissionParams) => Promise<any>;
  };
}
