# ForgeBase API

A flexible, framework-agnostic API library for building robust backend services with built-in database and storage capabilities. This library provides a unified interface for handling database operations across various Node.js frameworks, with first-class support for NestJS.

## Purpose

ForgeBase API serves as a bridge between your application and ForgeBase services, providing:

1. **Unified Interface**: A consistent way to interact with ForgeBase services.
2. **Framework Integrations**: Built-in support for NestJS (`@forgebase/api/core/nest`).
3. **Database Access**: Direct access to ForgeBase Database with full support for schema management, data operations, and row-level security.
4. **Type Safety**: Full TypeScript support.

## Installation

```bash
npm install @forgebase/api @forgebase/database kysely
# Install database driver based on your needs
npm install better-sqlite3 # for SQLite
# or
npm install pg # for PostgreSQL
# or
npm install @libsql/client # for Turso/LibSQL
```

## Framework Integration

### NestJS Integration

ForgeBase API provides a dedicated module for NestJS integration, making it easy to convert your NestJS application into a ForgeBase-compatible backend.

```typescript
import { Module } from '@nestjs/common';
import { ForgeBaseModule } from '@forgebase/api/core/nest';
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';

// Initialize Kysely
const db = new Kysely({
  dialect: new SqliteDialect({
    database: new Database('mydb.sqlite'),
  }),
});

@Module({
  imports: [
    ForgeBaseModule.register({
      config: {
        db: db,
        enforceRls: true, // Enable Row-Level Security
      },
    }),
    // Your other modules...
  ],
})
export class AppModule {}
```

This will automatically register the `DatabaseService` and expose the standard ForgeBase REST API endpoints via `DataController` and `SchemaController`.

## Database Operations

You can inject `DatabaseService` into your services to perform database operations programmatically.

```typescript
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@forgebase/api/core';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(userContext: any) {
    return this.db.query(
      'users',
      {
        select: ['id', 'name', 'email'],
        limit: 10,
      },
      userContext,
    );
  }

  async create(data: any, userContext: any) {
    return this.db.insert(
      'users',
      {
        tableName: 'users',
        data: data,
      },
      userContext,
    );
  }
}
```

### Supported Operations

The `DatabaseService` exposes the following methods:

- `query(tableName, queryParams, userContext)`: Query records.
- `insert(tableName, data, userContext)`: Create new records.
- `update(params, userContext)`: Update records by ID.
- `advanceUpdate(params, userContext)`: Update records matching a query.
- `delete(tableName, id, userContext)`: Delete a record by ID.
- `advanceDelete(params, userContext)`: Delete records matching a query.

## Schema Management

You can also manage your database schema programmatically.

```typescript
// Create a new table
await db.createSchema('users', [
  { name: 'id', type: 'increments', primary: true, nullable: false },
  { name: 'email', type: 'string', unique: true, nullable: false },
]);

// Add columns
await db.addColumn('users', [{ name: 'age', type: 'integer', nullable: true }]);

// Modify permissions
// Get the permission service
const permService = db.getPermissionService();
await permService.setPermissionsForTable('users', {
  operations: {
    SELECT: [{ allow: 'public' }],
    INSERT: [{ allow: 'role', roles: ['admin'] }],
  },
});
```

## REST API Reference

When using `ForgeBaseModule`, the following endpoints are automatically available:

### Data Endpoints

- `POST /data/:tableName/query`: Query records
- `POST /data/:tableName`: Create record
- `PUT /data/:tableName/:id`: Update record
- `POST /data/advance-update`: Advanced update
- `POST /data/:tableName/:id`: Delete record (via POST to support strict firewalls/proxies if needed, or check specific controller implementation)
- `POST /data/advance-delete`: Advanced delete

### Schema Endpoints

- `GET /schema`: Get full schema
- `GET /schema/tables`: Get list of tables
- `GET /schema/:tableName`: Get specific table info
- `POST /schema/:tableName`: Create table
- `DELETE /schema/:tableName`: Delete table
- `POST /schema/:tableName/column`: Add column
- `PUT /schema/:tableName/column`: Update column
- `DELETE /schema/:tableName/column`: Delete column

## License

MIT
