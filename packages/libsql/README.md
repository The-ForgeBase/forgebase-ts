# @the-forgebase/knex-libsql

A Knex dialect for using [LibSQL](https://libsql.org/) / [Turso](https://turso.tech/).


This allows you to use the power of Knex.js query builder with LibSQL databases.

## Installation

```bash
npm install knex @the-forgebase/knex-libsql libsql
```

or

```bash
pnpm add knex @the-forgebase/knex-libsql libsql
```

or

```bash
yarn add knex @the-forgebase/knex-libsql libsql
```

## Usage

To use this dialect, you need to configure Knex to use `@the-forgebase/knex-libsql` as the client.

```typescript
import { knex } from 'knex';
import { LibSqlKnexClient } from '@the-forgebase/knex-libsql';

const db = knex({
  client: LibSqlKnexClient,
  connection: {
    // For local file database
    filename: 'file:my.db', 
    
    // For remote database with Turso
    // url: process.env.TURSO_DATABASE_URL,
    // authToken: process.env.TURSO_AUTH_TOKEN,
  },
  useNullAsDefault: true,
});

// Now you can use `db` to build queries
async function example() {
  await db.schema.createTable('users', (table) => {
    table.increments('id');
    table.string('name');
  });

  await db('users').insert({ name: 'ForgeBase' });

  const users = await db('users').select('*');
  console.log(users);

  await db.destroy();
}

example();
```

The `client` property should be the `LibSqlKnexClient` class imported from this package. The `connection` object is passed to the LibSQL driver. 

For local development, you can use a `filename` for a local SQLite file.

For remote databases, like Turso, you can provide a `url` and `authToken`.

## Why `@the-forgebase/knex-libsql`?

The official `knex-libsql` package ([@libsql/knex-libsql](https://github.com/libsql/knex-libsql)) is a great lightweight option. However, it is based on the `sqlite3` package, whereas this package uses `better-sqlite3`.

This package takes a different approach by extending Knex's built-in `better-sqlite3` dialect. This allows us to leverage the existing, mature, and feature-rich functionalities of the `better-sqlite3` dialect while adapting it to work with `libsql`. This can provide a more stable and full-featured experience for developers already familiar with Knex's SQLite integrations.

## Credits

This package is heavily based on the SQLite dialect implementation from [MikroORM](https://github.com/mikro-orm/mikro-orm).

Specifically, the following files were adapted:
- `SqliteTableCompiler.ts`: from [mikro-orm/packages/knex/src/dialects/sqlite/SqliteTableCompiler.ts](https://github.com/mikro-orm/mikro-orm/blob/master/packages/knex/src/dialects/sqlite/SqliteTableCompiler.ts)
- `LibSqlKnexDialect.ts`: from [mikro-orm/packages/knex/src/dialects/sqlite/LibSqlKnexDialect.ts](https://github.com/mikro-orm/mikro-orm/blob/master/packages/knex/src/dialects/sqlite/LibSqlKnexDialect.ts)

We are grateful for the excellent work done by the MikroORM team. 