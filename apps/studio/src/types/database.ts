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

export interface ColumnSchemaType {
  name: string;
  table: string;
  data_type: ColumnType;
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

export interface TableSchemaAPI {
  [tableName: string]: {
    columns: ColumnSchemaType[];
    foreignKeys: any[]; // We'll keep this as 'any[]' for now, as the structure wasn't specified
  }
}

// We'll keep the existing TableSchema for creating tables
export interface ColumnDefinition {
  name: string;
  type: ColumnType;
  primary?: boolean;
  unique: boolean;
  nullable: boolean;
  foreignKey?: ForeignKey;
  default?: any;
}

export interface ForeignKey {
  columnName: string;
  references: {
    tableName: string;
    columnName: string;
  };
}

export interface TableSchema {
  [tableName: string]: {
    columns: ColumnDefinition[];
    foreignKeys: ForeignKey[];
  };
}

export interface SchemaOperation {
  action: "create" | "delete" | "alter";
  tableName: string;
  columns?: ColumnDefinition[];
}

