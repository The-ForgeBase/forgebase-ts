import { BaaSConfig } from '../types';
import { Kysely } from 'kysely';
import {
  AdvanceDataDeleteParams,
  AdvanceDataMutationParams,
  ColumnDefinition,
  DatabaseSchema,
  DataMutationParams,
  DataQueryParams,
  ForeignKey,
  ForgeDatabase,
  KyselyHooks,
  PermissionService,
  TableInfo,
  TablePermissions,
  UpdateColumnDefinition,
  UserContext,
} from '@forgebase/database';

export class DatabaseService {
  private config: BaaSConfig['services']['db'];
  private forgeDatabase: ForgeDatabase;

  constructor(config?: BaaSConfig['services']['db']) {
    this.config = config;

    if (this.config.db) {
      this.forgeDatabase = this.config.db;
    } else {
      this.forgeDatabase = new ForgeDatabase({
        db: this.config.config.db,
        hooks: this.config.config.hooks,
        permissionsService: this.config.config.permissionsService,
        ...this.config.config,
      });
    }
  }

  getDbInstance(): Kysely<any> {
    return this.forgeDatabase.getDbInstance();
  }

  getPermissionService(): PermissionService {
    return this.forgeDatabase.getPermissionService();
  }

  getForgeDatabase(): ForgeDatabase {
    return this.forgeDatabase;
  }

  getHookableDB(): KyselyHooks {
    return this.forgeDatabase.getHooksDb();
  }

  async query(
    tableName: string,
    query: DataQueryParams,
    userContext: UserContext,
    isSystem = false,
  ): Promise<any[]> {
    const records = await this.forgeDatabase.endpoints.data.query<any>(
      tableName,
      query,
      userContext,
      isSystem,
    );
    return records;
  }

  async insert(
    tableName: string,
    data: DataMutationParams,
    userContext: UserContext,
    isSystem = false,
  ): Promise<any> {
    try {
      // console.log('Inserting data', data, { ...data, tableName });
      const records = await this.forgeDatabase.endpoints.data.create(
        { ...data, tableName },
        userContext,
        isSystem,
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
    isSystem = false,
  ): Promise<any> {
    const records = await this.forgeDatabase.endpoints.data.update(
      params,
      userContext,
      isSystem,
    );
    return records;
  }

  async advanceUpdate(
    params: AdvanceDataMutationParams,
    userContext: UserContext,
    isSystem = false,
  ): Promise<any> {
    const records = await this.forgeDatabase.endpoints.data.advanceUpdate(
      params,
      userContext,
      isSystem,
    );
    return records;
  }

  async delete(
    tableName: string,
    id: string | number,
    userContext: UserContext,
    isSystem = false,
  ): Promise<any> {
    const records = await this.forgeDatabase.endpoints.data.delete(
      { tableName, id },
      userContext,
      isSystem,
    );
    return records;
  }

  async advanceDelete(
    params: AdvanceDataDeleteParams,
    userContext: UserContext,
    isSystem = false,
  ): Promise<any> {
    const records = await this.forgeDatabase.endpoints.data.advanceDelete(
      params,
      userContext,
      isSystem,
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
    const schema =
      await this.forgeDatabase.endpoints.schema.getTableSchema(tableName);
    return schema;
  }
  async getTableSchemaWithPermissions(tableName: string): Promise<{
    name: string;
    info: TableInfo;
    permissions: TablePermissions;
  }> {
    const schema =
      await this.forgeDatabase.endpoints.schema.getTableSchemaWithPermissions(
        tableName,
      );
    return schema;
  }

  async createSchema(
    tableName: string,
    columns: ColumnDefinition[],
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
    columns: ColumnDefinition[] | UpdateColumnDefinition[],
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
    columns: ColumnDefinition[] | UpdateColumnDefinition[],
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
    columns: UpdateColumnDefinition[],
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
    const tb =
      await this.forgeDatabase.endpoints.schema.truncateTable(tableName);
    return tb;
  }

  async getPermissions(tableName: string): Promise<any> {
    const permissions =
      await this.getPermissionService().getPermissionsForTable(tableName);
    return permissions;
  }

  async setPermissions(
    tableName: string,
    permissions: TablePermissions,
  ): Promise<TablePermissions> {
    const result = await this.getPermissionService().setPermissionsForTable(
      tableName,
      permissions,
    );
    return result;
  }
}
