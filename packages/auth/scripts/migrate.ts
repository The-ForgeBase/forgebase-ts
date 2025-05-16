import type { Knex } from 'knex';
import knex from 'knex';
import path from 'node:path';

async function loadConfig(): Promise<Record<string, Knex.Config>> {
  try {
    const knexfile = path.resolve(process.cwd(), 'knexfile.js');
    // Use dynamic import for ESM compatibility
    return (await import(knexfile)).default;
  } catch (e) {
    try {
      const knexfile = path.resolve(process.cwd(), 'knexfile.cjs');
      // Use dynamic import for ESM compatibility
      return (await import(knexfile)).default;
    } catch (e2) {
      console.error(
        'Could not find knexfile.js or knexfile.cjs in the current directory',
      );
      process.exit(1);
    }
  }
}

async function migrate() {
  const config = await loadConfig();
  const env = process.env.NODE_ENV || 'development';
  const envConfig = config[env];

  if (!envConfig) {
    console.error(`No configuration for environment: ${env}`);
    process.exit(1);
  }

  const db = knex(envConfig);

  try {
    await db.migrate.latest();
    console.log('Migration complete');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

migrate().catch(console.error);
