import type { Knex } from "knex";
import { SQLiteAdapter } from "./sqlite.js";
import { PostgresAdapter } from "./postgres.js";
import type { DatabaseAdapter } from "./base.js";

const getLibSQL = (client: any) => {
  if (client === "Client_Libsql") {
    return true;
  }
  console.log(client);
  return false;
};

export function getAdapter(knex: Knex): DatabaseAdapter {
  let client = knex.client.config.client;

  //console.log("Database client:", client);

  if (getLibSQL(knex.client.constructor.name)) {
    client = "libsql";
  }

  switch (client) {
    case "sqlite3":
      return new SQLiteAdapter();
    case "pg":
      return new PostgresAdapter();
    case "libsql":
      return new SQLiteAdapter();
    default:
      throw new Error(`Unsupported database client: ${client}`);
  }
}

export { DatabaseFeature } from "./base.js";
export type { DatabaseAdapter } from "./base.js";
