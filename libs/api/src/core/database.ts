import { BaaSConfig } from '../types';
import knex from 'knex';
import Client_Libsql from '@libsql/knex-libsql';
import {
  ColumnDefinition,
  DatabaseSchema,
  DataMutationParams,
  DataQueryParams,
  ForeignKey,
  ForgeDatabase,
  KnexHooks,
  PermissionService,
  TableInfo,
  TablePermissions,
  UpdateColumnDefinition,
  UserContext,
} from '@forgebase-ts/database';
import { resolve } from 'path';

export class DatabaseService {
  private config: BaaSConfig['services']['db'];
  private knexInstance: knex.Knex;
  private permissionService: PermissionService;
  private hookableDB: KnexHooks;
  private forgeDatabase: ForgeDatabase;

  constructor(config?: BaaSConfig['services']['db']) {
    this.config = config || {
      provider: 'sqlite',
      realtime: false,
      enforceRls: false,
      config: {
        filename: resolve(__dirname, '../database.sqlite'),
      },
    };
    let knexDb: knex.Knex;

    console.log(`Initializing database service with provider: ${this.config}`);

    if (this.config.knex) {
      knexDb = this.config.knex;
      console.log('Using knex instance from config');
    } else {
      if (this.config.provider === 'sqlite') {
        knexDb = knex({
          client: 'sqlite3',
          connection: {
            filename: this.config.config.filename,
          },
          useNullAsDefault: true,
          ...this.config.config,
        });
        console.log('Using sqlite3');
      } else if (this.config.provider === 'postgres') {
        knexDb = knex({
          client: 'pg',
          connection: this.config.config.connection,
          ...this.config.config,
        });
      } else if (this.config.provider === 'libsql') {
        knexDb = knex({
          client: Client_Libsql,
          connection: {
            filename: this.config.config.filename,
          },
          useNullAsDefault: true,
          ...this.config.config,
        });
      } else {
        throw new Error('Unsupported database provider');
      }
    }

    this.knexInstance = knexDb;
    this.permissionService = new PermissionService(this.knexInstance);
    this.hookableDB = new KnexHooks(this.knexInstance);
    this.forgeDatabase = new ForgeDatabase({
      db: this.knexInstance,
      hooks: this.hookableDB,
      permissions: this.permissionService,
      realtime: config?.realtime || false,
      enforceRls: config?.enforceRls || false,
    });
  }

  getDbInstance(): knex.Knex {
    return this.knexInstance;
  }

  getPermissionService(): PermissionService {
    return this.permissionService;
  }

  getForgeDatabase(): ForgeDatabase {
    return this.forgeDatabase;
  }

  getHookableDB(): KnexHooks {
    return this.hookableDB;
  }
  async query(
    tableName: string,
    query: DataQueryParams,
    userContext: UserContext,
    isSystem = false
  ): Promise<any[]> {
    const records = await this.forgeDatabase.endpoints.data.query<any>(
      tableName,
      query,
      userContext,
      isSystem
    );
    return records;
  }

  async insert(
    tableName: string,
    data: DataMutationParams,
    userContext: UserContext,
    isSystem = false
  ): Promise<any> {
    try {
      console.log('Inserting data', data, { ...data, tableName });
      const records = await this.forgeDatabase.endpoints.data.create(
        { ...data, tableName },
        userContext,
        isSystem
      );
      return records;
    } catch (error) {
      console.error('Error inserting data', error);
      throw error;
    }
  }

  async update(
    params: DataMutationParams,
    userContext: UserContext,
    isSystem = false
  ): Promise<any> {
    const records = await this.forgeDatabase.endpoints.data.update(
      params,
      userContext,
      isSystem
    );
    return records;
  }

  async delete(
    tableName: string,
    id: string | number,
    userContext: UserContext,
    isSystem = false
  ): Promise<any> {
    const records = await this.forgeDatabase.endpoints.data.delete(
      { tableName, id },
      userContext,
      isSystem
    );
    return records;
  }

  async getSchema(): Promise<DatabaseSchema> {
    const schema = await this.forgeDatabase.endpoints.schema.get();
    return schema;
  }

  async getTables(): Promise<string[]> {
    const tables = await this.forgeDatabase.endpoints.schema.getTables();
    return tables;
  }

  async getTableSchema(tableName: string): Promise<{
    name: string;
    info: TableInfo;
  }> {
    const schema = await this.forgeDatabase.endpoints.schema.getTableSchema(
      tableName
    );
    return schema;
  }
  async getTableSchemaWithPermissions(tableName: string): Promise<{
    name: string;
    info: TableInfo;
    permissions: TablePermissions;
  }> {
    const schema =
      await this.forgeDatabase.endpoints.schema.getTableSchemaWithPermissions(
        tableName
      );
    return schema;
  }

  async createSchema(
    tableName: string,
    columns: ColumnDefinition[]
  ): Promise<{
    message: string;
    tablename: string;
    action: string;
  }> {
    const tb = await this.forgeDatabase.endpoints.schema.create({
      tableName,
      columns: columns as any,
    });
    return tb;
  }

  async deleteSchema(tableName: string): Promise<{
    message: string;
    tablename: string;
    action: string;
  }> {
    const tb = await this.forgeDatabase.endpoints.schema.delete(tableName);
    return tb;
  }

  async addColumn(
    tableName: string,
    columns: ColumnDefinition[] | UpdateColumnDefinition[]
  ): Promise<any> {
    const tb = await this.forgeDatabase.endpoints.schema.modify({
      action: 'addColumn',
      tableName,
      columns,
    });
    return tb;
  }

  async deleteColumn(
    tableName: string,
    columns: ColumnDefinition[] | UpdateColumnDefinition[]
  ): Promise<any> {
    const tb = await this.forgeDatabase.endpoints.schema.modify({
      action: 'deleteColumn',
      tableName,
      columns,
    });
    return tb;
  }

  async updateColumn(
    tableName: string,
    columns: UpdateColumnDefinition[]
  ): Promise<any> {
    const tb = await this.forgeDatabase.endpoints.schema.modify({
      action: 'updateColumn',
      tableName,
      columns,
    });
    return tb;
  }

  async addForeignKey(tableName: string, foreignKey: ForeignKey): Promise<any> {
    const fk = await this.forgeDatabase.endpoints.schema.addForeingKey({
      tableName,
      column: foreignKey.columnName,
      foreignTableName: foreignKey.references.tableName,
      foreignColumn: foreignKey.references.columnName,
    });
    return fk;
  }

  async dropForeignKey(tableName: string, column: string): Promise<any> {
    const fk = await this.forgeDatabase.endpoints.schema.dropForeignKey({
      tableName,
      column,
    });
    return fk;
  }

  async truncateTable(tableName: string): Promise<any> {
    const tb = await this.forgeDatabase.endpoints.schema.truncateTable(
      tableName
    );
    return tb;
  }

  async getPermissions(tableName: string): Promise<any> {
    const permissions = await this.permissionService.getPermissionsForTable(
      tableName
    );
    return permissions;
  }

  async setPermissions(
    tableName: string,
    permissions: TablePermissions
  ): Promise<TablePermissions> {
    const result = await this.permissionService.setPermissionsForTable(
      tableName,
      permissions
    );
    return result;
  }
}
