import type { Knex } from 'knex';

// This is a template knexfile - users should copy and modify this for their needs
const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: {
      database: 'forgebase_auth_dev',
      user: 'postgres',
      password: 'postgres',
    },
    migrations: {
      directory: './migrations',
      extension: 'ts',
    },
  },

  test: {
    client: 'pg',
    connection: {
      database: 'forgebase_auth_test',
      user: 'postgres',
      password: 'postgres',
    },
    migrations: {
      directory: './migrations',
      extension: 'ts',
    },
  },

  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: './migrations',
      extension: 'ts',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};

export default config;
