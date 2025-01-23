import { BaaSConfig } from "../types";
import { knex, type Knex } from "knex";
import Client_Libsql from "@libsql/knex-libsql";
import {
  ColumnDefinition,
  DataMutationParams,
  DataQueryParams,
  ForeignKey,
  ForgeDatabase,
  KnexHooks,
  PermissionService,
  TablePermissions,
  UpdateColumnDefinition,
  UserContext,
} from "database";
import { resolve } from "path";

export class DatabaseService {
  private config: BaaSConfig["services"]["db"];
  private knexInstance: Knex;
  private permissionService: PermissionService;
  private hookableDB: KnexHooks;
  private forgeDatabase: ForgeDatabase;

  constructor(config?: BaaSConfig["services"]["db"]) {
    this.config = config || {
      provider: "sqlite",
      realtime: false,
      enforceRls: false,
      config: {
        filename: resolve(__dirname, "../database.sqlite"),
      },
    };
    let knexDb: Knex;

    if (this.config.knex) {
      knexDb = this.config.knex;
    } else {
      if (this.config.provider === "sqlite") {
        knexDb = knex({
          client: "sqlite",
          connection: {
            filename: this.config.config.filename,
          },
          ...this.config.config,
        });
      } else if (this.config.provider === "postgres") {
        knexDb = knex({
          client: "pg",
          connection: this.config.config.connection,
          ...this.config.config,
        });
      } else if (this.config.provider === "libsql") {
        knexDb = knex({
          client: Client_Libsql,
          connection: {
            filename: this.config.config.filename,
          },
          useNullAsDefault: true,
          ...this.config.config,
        });
      } else {
        throw new Error("Unsupported database provider");
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

  getDbInstance(): Knex {
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
    userContext: UserContext
  ): Promise<any[]> {
    try {
      const records = await this.forgeDatabase.endpoints.data.query<any>(
        tableName,
        query,
        userContext
      );
      return records;
    } catch (error) {
      throw error;
    }
  }

  async insert(
    tableName: string,
    data: DataMutationParams,
    userContext: UserContext
  ): Promise<any> {
    try {
      const records = await this.forgeDatabase.endpoints.data.create(
        { ...data, tableName },
        userContext
      );
      return records;
    } catch (error) {
      throw error;
    }
  }

  async update(
    params: DataMutationParams,
    userContext: UserContext
  ): Promise<any> {
    try {
      const records = await this.forgeDatabase.endpoints.data.update(
        params,
        userContext
      );
      return records;
    } catch (error) {
      throw error;
    }
  }

  async delete(
    tableName: string,
    id: string | number,
    userContext: UserContext
  ): Promise<any> {
    try {
      const records = await this.forgeDatabase.endpoints.data.delete(
        { tableName, id },
        userContext
      );
      return records;
    } catch (error) {
      throw error;
    }
  }

  async getSchema(): Promise<any> {
    try {
      const schema = await this.forgeDatabase.endpoints.schema.get();
      return schema;
    } catch (error) {
      throw error;
    }
  }

  async creatSchema(
    tableName: string,
    columns: ColumnDefinition[]
  ): Promise<{
    message: string;
    tablename: string;
    action: string;
  }> {
    try {
      const tb = await this.forgeDatabase.endpoints.schema.create({
        tableName,
        columns: columns as any,
      });
      return tb;
    } catch (error) {
      throw error;
    }
  }

  async addColumn(
    tableName: string,
    columns: ColumnDefinition[] | UpdateColumnDefinition[]
  ): Promise<any> {
    try {
      const tb = await this.forgeDatabase.endpoints.schema.modify({
        action: "addColumn",
        tableName,
        columns,
      });
      return tb;
    } catch (error) {
      throw error;
    }
  }

  async deleteColumn(
    tableName: string,
    columns: ColumnDefinition[] | UpdateColumnDefinition[]
  ): Promise<any> {
    try {
      const tb = await this.forgeDatabase.endpoints.schema.modify({
        action: "deleteColumn",
        tableName,
        columns,
      });
      return tb;
    } catch (error) {
      throw error;
    }
  }

  async updateColumn(
    tableName: string,
    columns: UpdateColumnDefinition[]
  ): Promise<any> {
    try {
      const tb = await this.forgeDatabase.endpoints.schema.modify({
        action: "updateColumn",
        tableName,
        columns,
      });
      return tb;
    } catch (error) {
      throw error;
    }
  }

  async addForeignKey(tableName: string, foreignKey: ForeignKey): Promise<any> {
    try {
      const fk = await this.forgeDatabase.endpoints.schema.addForeingKey({
        tableName,
        column: foreignKey.columnName,
        foreignTableName: foreignKey.references.tableName,
        foreignColumn: foreignKey.references.columnName,
      });
      return fk;
    } catch (error) {
      throw error;
    }
  }

  async dropForeignKey(tableName: string, column: string): Promise<any> {
    try {
      const fk = await this.forgeDatabase.endpoints.schema.dropForeignKey({
        tableName,
        column,
      });
      return fk;
    } catch (error) {
      throw error;
    }
  }

  async truncateTable(tableName: string): Promise<any> {
    try {
      const tb =
        await this.forgeDatabase.endpoints.schema.truncateTable(tableName);
      return tb;
    } catch (error) {
      throw error;
    }
  }

  async getPermissions(tableName: string): Promise<any> {
    try {
      const permissions =
        await this.permissionService.getPermissionsForTable(tableName);
      return permissions;
    } catch (error) {
      throw error;
    }
  }

  async setPermissions(
    tableName: string,
    permissions: TablePermissions
  ): Promise<any> {
    try {
      const result = await this.permissionService.setPermissionsForTable(
        tableName,
        permissions
      );
      return result;
    } catch (error) {
      throw error;
    }
  }
}
