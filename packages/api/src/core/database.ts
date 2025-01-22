import { BaaSConfig } from "../types";
import { knex, type Knex } from "knex";
import Client_Libsql from "@libsql/knex-libsql";
import {
  DataMutationParams,
  DataQueryParams,
  Forgebase,
  KnexHooks,
  PermissionService,
  UserContext,
} from "database";

export class DatabaseService {
  private config: BaaSConfig["services"]["db"];
  private knexInstance: Knex;
  private permissionService: PermissionService;
  private hookableDB: KnexHooks;
  private forgebase: Forgebase;

  constructor(config?: BaaSConfig["services"]["db"]) {
    this.config = config || { provider: "sqlite", realtime: false };
    let knexDb: Knex = knex({
      client: "sqlite",
      connection: {
        filename: process.env.DB_URL!,
      },
      useNullAsDefault: true, // Required for SQLite
    });

    if (this.config.knex) {
      knexDb = this.config.knex;
    }

    if (!this.config.knex) {
      if (this.config.provider === "sqlite") {
        knexDb = knex({
          client: "sqlite",
          connection: {
            filename: process.env.DB_URL!,
          },
          useNullAsDefault: true, // Required for SQLite
        });
      }

      if (this.config.provider === "postgres") {
        knexDb = knex({
          client: "pg",
          connection: this.config.config,
        });
      }

      if (this.config.provider === "libsql") {
        knexDb = knex({
          client: Client_Libsql,
          connection: {
            filename: process.env.DB_URL!,
          },
          useNullAsDefault: true, // Required for SQLite
        });
      }
    }

    this.knexInstance = knexDb;
    this.permissionService = new PermissionService(this.knexInstance);
    this.hookableDB = new KnexHooks(this.knexInstance);
    this.forgebase = new Forgebase({
      db: this.knexInstance,
      hooks: this.hookableDB,
      permissions: this.permissionService,
      realtime: config?.realtime || false,
    });
  }
  async query(
    tableName: string,
    query: DataQueryParams,
    userContext: UserContext
  ): Promise<any[]> {
    try {
      const records = await this.forgebase.endpoints.data.query<any>(
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
      const records = await this.forgebase.endpoints.data.create(
        { data, tableName },
        userContext
      );
      return records;
    } catch (error) {
      throw error;
    }
  }
}
