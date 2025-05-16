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

export interface ForeignKey {
  columnName: string;
  references: {
    tableName: string;
    columnName: string;
  };
}

export type UserContext = {
  userId: number | string;
  labels: string[];
  teams: string[];
  permissions?: string[]; // Optional explicit permissions
  role?: string;
};
