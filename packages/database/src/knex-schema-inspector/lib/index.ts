import { Knex } from "knex";
import { SchemaInspectorConstructor } from "./types/schema-inspector";
import sqlite from "./dialects/sqlite";

export function SchemaInspector(knex: Knex) {
  // biome-ignore lint/suspicious/noShadowRestrictedNames: <explanation>
  let constructor: SchemaInspectorConstructor;

  switch (knex.client.constructor.name) {
    case "Client_MySQL":
    case "Client_MySQL2":
      constructor = require("./dialects/mysql").default;
      break;
    case "Client_PG":
      constructor = require("./dialects/postgres").default;
      break;
    case "Client_CockroachDB":
      constructor = require("./dialects/cockroachdb").default;
      break;
    case "Client_SQLite3":
    case "Client_BetterSQLite3":
    case "Client_Libsql":
    case "Client_LibSql":
    case "libsql":
      console.log("sqlite");
      constructor = sqlite;
      break;
    case "Client_Oracledb":
    case "Client_Oracle":
      constructor = require("./dialects/oracledb").default;
      break;
    case "Client_MSSQL":
      constructor = require("./dialects/mssql").default;
      break;

    default:
      throw Error(`Unsupported driver used: ${knex.client.constructor.name}`);
  }

  return new constructor(knex);
}

export default SchemaInspector;
