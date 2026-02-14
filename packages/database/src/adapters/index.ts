import type { Kysely } from 'kysely';
import { SQLiteAdapter } from './sqlite';
import { PostgresAdapter } from './postgres';
import type { DatabaseAdapter } from './base';

export function getAdapter(db: Kysely<any>): DatabaseAdapter {
  // Try to determine the adapter from the executor or provided config
  // Kysely structure: db.getExecutor().adapter

  // This is a heuristic based on Kysely internal class names or we can rely on passed config if we had it.
  // Assuming standard Kysely adapters.
  const adapterName = db.getExecutor().adapter.constructor.name;

  if (adapterName.includes('Postgres')) {
    return new PostgresAdapter();
  } else if (adapterName.includes('Sqlite') || adapterName.includes('Libsql')) {
    return new SQLiteAdapter();
  }

  // Default fallback or more checks
  return new SQLiteAdapter(); // Safest default for now? Or better throw?
}

export { DatabaseFeature } from './base';
export type { DatabaseAdapter } from './base';
