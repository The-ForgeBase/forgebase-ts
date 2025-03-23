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
