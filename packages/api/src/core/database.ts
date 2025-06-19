import { BaaSConfig } from "../types";
import knex from "knex";
import {
  AdvanceDataDeleteParams,
  AdvanceDataMutationParams,
  ColumnDefinition,
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
} from "@the-forgebase/database";

export class DatabaseService {
  private config: BaaSConfig["services"]["db"];
  private forgeDatabase: ForgeDatabase;

  constructor(config?: BaaSConfig["services"]["db"]) {
    this.config = config;
    this.forgeDatabase = new ForgeDatabase({
      db: this.config.config.db,
      hooks: this.config.config.hooks,
      permissionsService: this.config.config.permissionsService,
      ...this.config.config,
    });
  }

  getDbInstance(): knex.Knex {
    return this.forgeDatabase.getKnexInstance();
  }

  getPermissionService(): PermissionService {
    return this.forgeDatabase.getPermissionService();
  }

  getForgeDatabase(): ForgeDatabase {
    return this.forgeDatabase;
  }

  getHookableDB(): KnexHooks {
    return this.forgeDatabase.getHooksDb();
  }

  async query(
    tableName: string,
    query: DataQueryParams,
    userContext: UserContext,
    isSystem = false,
  ) {
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
  ) {
    console.log("Inserting data", data, { ...data, tableName });
    const records = await this.forgeDatabase.endpoints.data.create(
      { ...data, tableName },
      userContext,
      isSystem,
    );
    return records;
  }

  async update(
    params: DataMutationParams,
    userContext: UserContext,
    isSystem = false,
  ) {
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
  ) {
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
  ) {
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
  ) {
    const records = await this.forgeDatabase.endpoints.data.advanceDelete(
      params,
      userContext,
      isSystem,
    );
    return records;
  }

  async getSchema() {
    const schema = await this.forgeDatabase.endpoints.schema.get();
    return schema;
  }

  async getTables() {
    const tables = await this.forgeDatabase.endpoints.schema.getTables();
    return tables;
  }

  async getTableSchema(tableName: string) {
    const schema =
      await this.forgeDatabase.endpoints.schema.getTableSchema(tableName);
    return schema;
  }
  async getTableSchemaWithPermissions(tableName: string) {
    const schema =
      await this.forgeDatabase.endpoints.schema.getTableSchemaWithPermissions(
        tableName,
      );
    return schema;
  }

  async createSchema(tableName: string, columns: ColumnDefinition[]) {
    const tb = await this.forgeDatabase.endpoints.schema.create({
      tableName,
      columns: columns as any,
    });
    return tb;
  }

  async deleteSchema(tableName: string) {
    const tb = await this.forgeDatabase.endpoints.schema.delete(tableName);
    return tb;
  }

  async addColumn(
    tableName: string,
    columns: ColumnDefinition[] | UpdateColumnDefinition[],
  ) {
    const tb = await this.forgeDatabase.endpoints.schema.modify({
      action: "addColumn",
      tableName,
      columns,
    });
    return tb;
  }

  async deleteColumn(
    tableName: string,
    columns: ColumnDefinition[] | UpdateColumnDefinition[],
  ) {
    const tb = await this.forgeDatabase.endpoints.schema.modify({
      action: "deleteColumn",
      tableName,
      columns,
    });
    return tb;
  }

  async updateColumn(tableName: string, columns: UpdateColumnDefinition[]) {
    const tb = await this.forgeDatabase.endpoints.schema.modify({
      action: "updateColumn",
      tableName,
      columns,
    });
    return tb;
  }

  async addForeignKey(tableName: string, foreignKey: ForeignKey) {
    const fk = await this.forgeDatabase.endpoints.schema.addForeingKey({
      tableName,
      column: foreignKey.columnName,
      foreignTableName: foreignKey.references.tableName,
      foreignColumn: foreignKey.references.columnName,
    });
    return fk;
  }

  async dropForeignKey(tableName: string, column: string) {
    const fk = await this.forgeDatabase.endpoints.schema.dropForeignKey({
      tableName,
      column,
    });
    return fk;
  }

  async truncateTable(tableName: string) {
    const tb =
      await this.forgeDatabase.endpoints.schema.truncateTable(tableName);
    return tb;
  }

  async getPermissions(tableName: string) {
    const permissions =
      await this.getPermissionService().getPermissionsForTable(tableName);
    return permissions;
  }

  async setPermissions(tableName: string, permissions: TablePermissions) {
    const result = await this.getPermissionService().setPermissionsForTable(
      tableName,
      permissions,
    );
    return result;
  }
}
