import { AwilixContainer } from 'awilix';
import { Knex } from 'knex';

export interface ValidationResult {
  isValid: boolean;
  errors?: Record<string, string> | undefined;
}

export type ValidationRule<T = any> = (
  value: T,
  input: AuthInput,
) => string | undefined;

export type ValidationSchema = Record<
  string,
  ValidationRule | ValidationRule[]
>;

type StepInputHook<T> = (
  input: T,
  container: AwilixContainer<ReAuthCradle>,
) => T | Promise<T>;
type StepOutputHook<T> = (
  output: T,
  container: AwilixContainer<ReAuthCradle>,
) => T | Promise<T>;

export interface AuthStepHooks {
  before?: StepInputHook<AuthInput>;
  after?: StepOutputHook<AuthOutput>;
  onError?: (
    error: Error,
    input: AuthInput,
    container: AwilixContainer<ReAuthCradle>,
  ) => Promise<void> | void;
}

export type PluginProp<T = any> = {
  pluginName: string;
  container: AwilixContainer<ReAuthCradle>;
  config: T;
};

export interface AuthStep<T> {
  name: string;
  description: string;
  validationSchema?: ValidationSchema;
  inputs: string[];
  hooks?: AuthStepHooks;
  registerHook?(
    type: HooksType,
    fn: (
      data: AuthInput | AuthOutput,
      container: AwilixContainer<ReAuthCradle>,
      error?: Error,
    ) => Promise<AuthOutput | AuthInput | void>,
  ): void;
  run(input: AuthInput, pluginProperties?: PluginProp<T>): Promise<AuthOutput>;
  protocol: {
    http?: {
      method: string;
      auth?: boolean;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

export type AuthInput = {
  entity?: Entity;
  token?: AuthToken;
} & Record<string, any>;

export type HooksType = 'before' | 'after' | 'onError';

export interface SensitiveFields {
  [pluginName: string]: string[];
}

export interface AuthPlugin<T = any> {
  name: string;
  steps: AuthStep<T>[];
  container?: AwilixContainer<ReAuthCradle>;
  /**
   * Initialize the plugin with an optional DI container
   * @param container Optional Awilix container for dependency injection
   */
  initialize(container: AwilixContainer<ReAuthCradle>): Promise<void> | void;

  /**
   * Returns an array of field names that should be considered sensitive
   * and redacted during serialization
   */
  getSensitiveFields?(): string[];

  migrationConfig?: PluginMigrationConfig;

  config: T;

  runStep?(
    step: string,
    input: AuthInput,
    container: AwilixContainer<ReAuthCradle>,
  ): Promise<AuthOutput>;
}

export type AuthOutput = {
  entity?: Entity;
  token?: AuthToken;
  redirect?: string;
  success: boolean;
  message: string;
  status: string;
} & Record<string, any>;

export interface BaseReAuthCradle {
  entityService: EntityService;
  sessionService: SessionService;
  knex: Knex;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ReAuthCradleExtension {}

export interface ReAuthCradle extends BaseReAuthCradle, ReAuthCradleExtension {
  sensitiveFields: SensitiveFields;
  serializeEntity: <T extends Entity>(entity: T) => T;
}

type CradleService<T extends keyof ReAuthCradle> = ReAuthCradle[T];

export interface ColumnDefinition {
  type:
    | 'string'
    | 'integer'
    | 'boolean'
    | 'datetime'
    | 'timestamp'
    | 'text'
    | 'json'
    | 'decimal'
    | 'uuid';
  length?: number;
  nullable?: boolean;
  defaultValue?: any;
  unique?: boolean;
  index?: boolean;
  primary?: boolean;
  references?: {
    table: string;
    column: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  };
}

export interface TableSchema {
  tableName: string;
  columns: Record<string, ColumnDefinition>;
  timestamps?: boolean;
  indexes?: Array<{
    columns: string[];
    name?: string;
    unique?: boolean;
  }>;
}

export interface PluginMigrationConfig {
  pluginName: string;
  tables?: TableSchema[];
  extendTables?: Array<{
    tableName: string;
    columns: Record<string, ColumnDefinition>;
    indexes?: Array<{
      columns: string[];
      name?: string;
      unique?: boolean;
    }>;
  }>;
}

export interface MigrationConfig {
  migrationName: string;
  outputDir: string;
  plugins: PluginMigrationConfig[];
  baseTables?: TableSchema[];
}

export class ConfigError extends Error {
  constructor(
    message: string,
    public pluginName: string,
    public data?: any,
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class AuthInputError extends Error {
  constructor(
    message: string,
    public pluginName: string,
    public stepName: string,
    public data?: any,
  ) {
    super(message);
    this.name = 'AuthInputError';
  }
}

export class StepNotFound extends Error {
  constructor(
    step: string,
    public pluginName: string,
  ) {
    super(`Step ${step} not found for plugin ${pluginName}`);
    this.name = 'StepNotFound';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public pluginName: string,
    public stepName: string,
    public hookType?: HooksType,
    public data?: any,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class PluginNotFound extends Error {
  constructor(plugin: string) {
    super(`Plugin ${plugin} not found`);
    this.name = 'PluginNotFound';
  }
}

export class HooksError extends Error {
  data?: any;

  constructor(
    message: string,
    public pluginName: string,
    public stepName: string,
    public hookType: HooksType,
    data?: any,
  ) {
    super(message);
    this.name = 'HooksError';
    this.data = data;
  }
}

export class InitializationError extends Error {
  constructor(
    message: string,
    public pluginName: string,
    public data?: any,
  ) {
    super(message);
    this.name = 'InitializationError';
  }
}

export type BaseEntity = {
  id: string;
  role: string;
  created_at: Date;
  updated_at: Date;
};

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EntityExtension {}

// Generic type for custom user fields
export type Entity = BaseEntity & EntityExtension;

export interface BaseSession {
  id: string;
  entity_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface SessionExtension {}

export type Session = BaseSession & SessionExtension;

export type AuthToken = string | null;

export type EntityService = {
  findEntity(id: string, filed: string): Promise<Entity | null>;
  createEntity(entity: Partial<Entity>): Promise<Entity>;
  updateEntity(
    id: string,
    filed: string,
    entity: Partial<Entity>,
  ): Promise<Entity>;
  deleteEntity(id: string, filed: string): Promise<void>;
};

export type SessionService = {
  createSession(entityId: string | number): Promise<AuthToken>;
  verifySession(
    token: string,
  ): Promise<{ entity: Entity | null; token: AuthToken }>;
  destroySession(token: string): Promise<void>;
  destroyAllSessions(entityId: string | number): Promise<void>;
};
