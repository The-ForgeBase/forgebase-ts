/**
 * Interface representing a database table with additional metadata
 */
export interface TableItem {
  /** Name of the table */
  name: string;
  /** Type of the table (system or user) */
  type: 'system' | 'user';
  /** Icon to display next to the table name */
  icon: string;
}

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

export interface TableColumn {
  name: string;
  table: string;
  data_type: string;
  default_value: string | null;
  max_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  is_generated: boolean;
  generation_expression: string | null;
  is_nullable: boolean;
  is_unique: boolean;
  is_primary_key: boolean;
  has_auto_increment: boolean;
  foreign_key_column: string | null;
  foreign_key_table: string | null;
}

export interface TableInfo {
  columns: TableColumn[];
  foreignKeys: any[];
}

export interface TableSchema {
  name: string;
  info: TableInfo;
}
