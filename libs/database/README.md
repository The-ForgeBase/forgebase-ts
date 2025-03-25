# ForgeBase Database

A comprehensive database management and integration library providing schema inspection, real-time synchronization, and advanced access control across multiple database dialects.

## Purpose

This library simplifies database operations by providing an abstraction layer that works with multiple database engines. It handles common database tasks like connection management, query building, migrations, and real-time updates, allowing developers to focus on their application logic rather than database implementation details.

## Core Features

- **Multi-Dialect Support**:

  - SQLite with full CRUD
  - PostgreSQL with schema management
  - MySQL/MariaDB integration
  - MS SQL Server compatibility
  - CockroachDB support
  - Oracle Database support
  - Schema inspection for all dialects

- **Schema Management**:

  - Auto-generated migrations
  - Schema versioning
  - Column type inference
  - Foreign key relationships
  - Index management
  - Custom constraints
  - Table comments and metadata

- **Query Building**:

  - Type-safe queries
  - Complex joins and relations
  - Aggregate functions
  - Window functions
  - Raw SQL support
  - Query optimization
  - Parameter binding

- **Access Control**:

  - Row-level security (RLS)
  - Column-based permissions
  - Role-based access (RBAC)
  - Dynamic policy rules
  - User context filtering
  - Audit logging
  - Permission inheritance

- **Real-time Features**:

  - Live queries
  - Change notifications
  - WebSocket integration
  - Presence tracking
  - Subscription management
  - Event buffering
  - Reconnection handling

- **Performance Features**:

  - Connection pooling
  - Query caching
  - Prepared statements
  - Batch operations
  - Transaction management
  - Indexing strategies
  - Query optimization

- **Developer Experience**:
  - TypeScript support
  - Auto-completion
  - Schema validation
  - Migration tooling
  - CLI utilities
  - Debugging tools
  - Comprehensive logging

## Why This Framework?

Our mission is to simplify backend development by providing a highly flexible, language-agnostic BaaS framework that developers can plug into their existing server setup. While we are 70% inspired by Pocketbase, we recognized its limitations—particularly its dependency on SQLite and its inability to scale horizontally. To overcome these challenges, we are building a better alternative that not only supports horizontal scaling but also integrates with more robust databases like PostgreSQL, SurrealDB, etc. This approach ensures that our framework is scalable, versatile, and suitable for a wide range of applications, from small projects to large, distributed systems.

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Configuration](#configuration)
  - [SQLite](#sqlite)
  - [PostgreSQL](#postgresql)
  - [MySQL](#mysql)
  - [MS SQL Server](#ms-sql-server)
- [API Reference](#api-reference)
  - [ForgeDatabase](#forgedatabase)
  - [SchemaInspector](#schemainspector)
- [Building](#building)
- [Running Tests](#running-tests)
- [Security Best Practices](#security-best-practices)
- [Framework Integration](#framework-integration)
- [Error Handling](#error-handling)

## Installation

```bash
npm install @forgebase-ts/database
# or
yarn add @forgebase-ts/database
# or
pnpm add @forgebase-ts/database
```

## Basic Usage

### 1. Database Connection

```typescript
import { createForgeDatabase } from '@forgebase-ts/database';
import { Knex } from 'knex';

const db = createForgeDatabase({
  db: knex({
    client: 'pg',
    connection: {
      host: 'localhost',
      database: 'myapp',
      user: 'username',
      password: 'password',
    },
  }),
  enforceRls: true,
  realtime: true,
});
```

### 2. Schema Management

```typescript
// Define table schema
await db.createSchema('users', [
  {
    name: 'id',
    type: 'increments',
    primary: true,
  },
  {
    name: 'email',
    type: 'string',
    unique: true,
    nullable: false,
  },
  {
    name: 'role',
    type: 'string',
    default: 'user',
  },
]);

// Add foreign key relationship
await db.createSchema('posts', [
  {
    name: 'id',
    type: 'increments',
    primary: true,
  },
  {
    name: 'title',
    type: 'string',
  },
  {
    name: 'author_id',
    type: 'integer',
    foreignKeys: {
      references: {
        table: 'users',
        column: 'id',
      },
    },
  },
]);
```

### 3. Permission Management

```typescript
// Set table-level permissions
await db.setPermissions('posts', {
  operations: {
    SELECT: [
      {
        allow: 'auth',
        fieldCheck: {
          field: 'author_id',
          operator: '===',
          valueType: 'userContext',
          value: 'userId',
        },
      },
    ],
    INSERT: [
      {
        allow: 'auth',
      },
    ],
    UPDATE: [
      {
        allow: 'auth',
        fieldCheck: {
          field: 'author_id',
          operator: '===',
          valueType: 'userContext',
          value: 'userId',
        },
      },
    ],
    DELETE: [
      {
        allow: 'auth',
        fieldCheck: {
          field: 'author_id',
          operator: '===',
          valueType: 'userContext',
          value: 'userId',
        },
      },
    ],
  },
});
```

### 4. Query Operations

```typescript
// Basic CRUD
const user = await db.insert('users', {
  email: 'user@example.com',
  role: 'admin',
});

const posts = await db.query('posts', {
  filter: { author_id: user.id },
  select: ['id', 'title'],
  limit: 10,
  offset: 0,
});

await db.update('posts', {
  where: { id: 1 },
  data: { title: 'Updated Title' },
});

await db.delete('posts', 1);

// Complex Queries
const stats = await db.query('posts', {
  select: ['author_id'],
  groupBy: ['author_id'],
  aggregate: {
    count: 'id',
    avg: 'likes',
  },
  having: {
    'count:id': { gt: 5 },
  },
});
```

### 5. Real-time Subscriptions

```typescript
// Subscribe to changes
const unsubscribe = await db.subscribe('posts', {
  filter: { author_id: userId },
  onChange: (change) => {
    console.log('Change detected:', change);
  },
});

// Later: cleanup subscription
unsubscribe();
```

## Configuration

### SQLite

```typescript
const config = {
  client: 'sqlite3',
  connection: {
    filename: './myapp.sqlite',
  },
  useNullAsDefault: true,
};
```

### PostgreSQL

```typescript
const config = {
  client: 'pg',
  connection: {
    host: 'localhost',
    port: 5432,
    database: 'myapp',
    user: 'postgres',
    password: 'password',
    ssl: false,
  },
  pool: {
    min: 2,
    max: 10,
  },
};
```

### MySQL

```typescript
const config = {
  client: 'mysql2',
  connection: {
    host: 'localhost',
    port: 3306,
    database: 'myapp',
    user: 'root',
    password: 'password',
  },
};
```

### MS SQL Server

```typescript
const config = {
  client: 'mssql',
  connection: {
    server: 'localhost',
    database: 'myapp',
    user: 'sa',
    password: 'password',
  },
};
```

## API Reference

### Core Classes

#### ForgeDatabase

```typescript
class ForgeDatabase {
  constructor(config: ForgeDatabaseConfig);

  // Schema Management
  createSchema(table: string, columns: ColumnDefinition[]): Promise<void>;
  updateSchema(table: string, updates: UpdateColumnDefinition[]): Promise<void>;
  dropSchema(table: string): Promise<void>;

  // CRUD Operations
  insert(table: string, data: any): Promise<any>;
  query(table: string, options: QueryOptions): Promise<any[]>;
  update(table: string, options: UpdateOptions): Promise<void>;
  delete(table: string, id: any): Promise<void>;

  // Permissions
  setPermissions(table: string, permissions: TablePermissions): Promise<void>;
  getPermissions(table: string): Promise<TablePermissions>;

  // Real-time
  subscribe(table: string, options: SubscribeOptions): Promise<Unsubscribe>;
}
```

#### SchemaInspector

```typescript
class SchemaInspector {
  constructor(knex: Knex);

  tables(): Promise<string[]>;
  tableInfo(table?: string): Promise<Table | Table[]>;
  hasTable(table: string): Promise<boolean>;
  columns(table?: string): Promise<Column[]>;
  columnInfo(table?: string, column?: string): Promise<ColumnInfo>;
  hasColumn(table: string, column: string): Promise<boolean>;
  primary(table: string): Promise<string>;
  foreignKeys(table?: string): Promise<ForeignKey[]>;
}
```

## Building

Run `nx build database` to build the library.

## Running Tests

```bash
# Run unit tests
nx test database

# Run integration tests
nx test database --config=integration

# Run specific dialect tests
nx test database --testPathPattern=sqlite
nx test database --testPathPattern=postgres
```

## Security Best Practices

1. **Row-Level Security**:

```typescript
// Enable RLS
const db = createForgeDatabase({
  enforceRls: true,
  // ...
});

// Set row-level policies
await db.setPermissions('documents', {
  operations: {
    SELECT: [
      {
        allow: 'auth',
        fieldCheck: {
          field: 'owner_id',
          operator: '===',
          valueType: 'userContext',
          value: 'userId',
        },
      },
    ],
  },
});
```

2. **Input Validation**:

```typescript
await db.createSchema('users', [
  {
    name: 'email',
    type: 'string',
    validate: {
      isEmail: true,
      maxLength: 255,
    },
  },
]);
```

3. **Query Sanitization**:

```typescript
// Use parameterized queries
const result = await db.query('users', {
  filter: { email }, // Parameters are automatically sanitized
  select: ['id', 'name'],
});
```

## Framework Integration

### NestJS

```typescript
import { Module } from '@nestjs/common';
import { ForgeApiModule } from '@forgebase-ts/api/core/nest';

@Module({
  imports: [
    ForgeApiModule.forRoot({
      services: {
        db: {
          provider: 'postgres',
          config: {
            // connection config
          },
          enforceRls: true,
        },
      },
    }),
  ],
})
export class AppModule {}
```

### Express

```typescript
import express from 'express';
import { forgeExpressMiddleware } from '@forgebase-ts/api';

const app = express();

app.use(
  forgeExpressMiddleware({
    services: {
      db: {
        provider: 'postgres',
        config: {
          // connection config
        },
      },
    },
  })
);
```

## Error Handling

```typescript
try {
  await db.query('users', {
    filter: { id: 1 },
  });
} catch (error) {
  if (error instanceof DatabaseError) {
    // Handle database errors
  } else if (error instanceof ValidationError) {
    // Handle validation errors
  } else if (error instanceof PermissionError) {
    // Handle permission errors
  }
}
```

## License

MIT
