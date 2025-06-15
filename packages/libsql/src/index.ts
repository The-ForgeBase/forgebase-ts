import { Client_LibSql } from "./dialect";
import { Knex } from "knex";

export const LibSqlKnexClient = Client_LibSql as unknown as Knex.Client;
