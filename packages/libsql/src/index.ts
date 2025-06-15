import { Client_LibSql } from "./dialect";
import knex from "knex";

export const LibSqlKnexClient =
  Client_LibSql as unknown as typeof knex.Knex.Client;
