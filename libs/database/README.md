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
  - Automatic permission initialization

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
  - [Transactions](#transactions)
  - [Permission Initialization](#automatic-permission-initialization)
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
  realtimeAdapter: 'websocket', // or 'sse' for Server-Sent Events
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

#### Realtime Adapters

ForgeBase Database supports two types of realtime adapters for table broadcasts:

1. **WebSocket Adapter (default)**: Uses uWebSockets.js for high-performance WebSocket communication.

2. **SSE Adapter**: Uses Server-Sent Events (SSE) for one-way communication from server to client. This is useful in environments where WebSockets might be blocked or when you need simpler one-way communication.

To configure the adapter type:

```typescript
const db = createForgeDatabase({
  // ... other options
  realtime: true,
  realtimeAdapter: 'sse', // 'websocket' (default) or 'sse'
  websocketPort: 9001, // Optional, defaults to 9001
});
```

Benefits of SSE adapter:

- Works through proxies and load balancers that might block WebSockets
- Simpler implementation for one-way communication
- Better compatibility with certain environments
- Lower overhead for read-only scenarios
- Uses pub/sub pattern for efficient message distribution

The SSE adapter uses the pub/sub pattern from the crossws library, which provides several advantages:

- Efficient message distribution to multiple subscribers
- Automatic channel management
- Simplified subscription handling
- Reduced memory footprint

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

#### Transactions

All database operations in the ForgeDatabase library support transactions, allowing you to perform multiple operations atomically. This ensures data consistency and prevents partial updates in case of errors.

There are two ways to use transactions in ForgeDatabase:

1. **Explicit Transactions**: Pass a transaction object to each method
2. **Implicit Transactions**: Use the built-in transaction method

##### Explicit Transactions

```typescript
// Import the necessary modules
import { createForgeDatabase } from '@forgebase-ts/database';
import knex from 'knex';

// Initialize the database
const knexInstance = knex({
  client: 'sqlite3',
  connection: {
    filename: './database.sqlite',
  },
  useNullAsDefault: true,
});

const db = createForgeDatabase({ db: knexInstance });

// Example: Using explicit transactions for multiple operations
async function createUserWithProfile() {
  // Start a transaction
  await knexInstance.transaction(async (trx) => {
    // Create a user
    const user = await db.endpoints.data.create(
      {
        tableName: 'users',
        data: { name: 'John Doe', email: 'john@example.com' },
      },
      { userId: 1 }, // user context
      false, // isSystem
      trx // pass the transaction
    );

    // Create a profile linked to the user
    await db.endpoints.data.create(
      {
        tableName: 'profiles',
        data: {
          user_id: user[0].id,
          bio: 'Software developer',
        },
      },
      { userId: 1 },
      false,
      trx
    );

    // If any operation fails, the entire transaction will be rolled back
  });
}
```

##### Implicit Transactions

ForgeDatabase also provides a built-in transaction method that automatically handles transactions for you:

```typescript
// Example: Using the built-in transaction method
async function createUserWithProfile() {
  // Use the built-in transaction method
  await db.transaction(async (trx) => {
    // Create a user
    const user = await db.endpoints.data.create(
      {
        tableName: 'users',
        data: { name: 'John Doe', email: 'john@example.com' },
      },
      { userId: 1 }, // user context
      false, // isSystem
      trx // pass the transaction
    );

    // Create a profile linked to the user
    await db.endpoints.data.create(
      {
        tableName: 'profiles',
        data: {
          user_id: user[0].id,
          bio: 'Software developer',
        },
      },
      { userId: 1 },
      false,
      trx
    );
  });
}
```

##### Automatic Transaction Management

All database operations in ForgeDatabase now automatically create a transaction if one is not provided. This makes the code more backward compatible and easier to use:

```typescript
// Example: Using automatic transaction management
async function createUserWithProfile() {
  // Create a user - transaction is created automatically
  const user = await db.endpoints.data.create(
    {
      tableName: 'users',
      data: { name: 'John Doe', email: 'john@example.com' },
    },
    { userId: 1 } // user context
  );

  // Create a profile - transaction is created automatically
  await db.endpoints.data.create(
    {
      tableName: 'profiles',
      data: {
        user_id: user[0].id,
        bio: 'Software developer',
      },
    },
    { userId: 1 }
  );

  // Note: These are two separate transactions. For atomic operations,
  // use one of the transaction methods above.
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

### Basic RLS

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

// Advanced RLS with customSql
// Example: Limit free users to 5 CVs, but allow pro users unlimited CVs
await db.setPermissions('cvs', {
  operations: {
    INSERT: [
      {
        allow: 'customSql',
        customSql: `
          SELECT 1 WHERE
            -- Check if user is on pro plan
            EXISTS (SELECT 1 FROM subscriptions WHERE user_id = :userId AND plan_type = 'pro')
            -- OR check if user is on free plan but has fewer than 5 CVs
            OR (
              NOT EXISTS (SELECT 1 FROM subscriptions WHERE user_id = :userId AND plan_type = 'pro')
              AND (SELECT COUNT(*) FROM cvs WHERE user_id = :userId) < 5
            )
        `,
      },
    ],
  },
});

// Advanced RLS with custom functions
// Register a custom RLS function
import { rlsFunctionRegistry } from '@forgebase-ts/database';

// Register a function that checks subscription limits
rlsFunctionRegistry.register('checkSubscriptionLimits', async (userContext, row, knex) => {
  if (!knex) return false;

  // Check if user is on pro plan
  const proSub = await knex('subscriptions').where({ user_id: userContext.userId, plan_type: 'pro' }).first();

  if (proSub) return true; // Pro users can create unlimited resources

  // For free users, check resource count
  const count = await knex('cvs').where({ user_id: userContext.userId }).count('id as count').first();

  return count && count.count < 5; // Allow if less than 5 resources
});

// Use the registered function in permissions
await db.setPermissions('cvs', {
  operations: {
    INSERT: [
      {
        allow: 'customFunction',
        customFunction: 'checkSubscriptionLimits',
      },
    ],
  },
});
```

### Custom SQL RLS

For complex permission rules that require database queries, use the `customSql` rule type. This allows you to write SQL queries that can access multiple tables and use the full power of SQL to determine permissions.

### Custom Function RLS

For the most flexible permission rules, you can register custom JavaScript functions that will be executed during permission checks. These functions have access to:

- The user context (userId, role, etc.)
- The row data being accessed
- The database connection (knex instance)

#### Comparison between customSql and customFunction

| Feature            | customSql        | customFunction        |
| ------------------ | ---------------- | --------------------- |
| Database Access    | Yes (SQL only)   | Yes (full Knex API)   |
| Language           | SQL              | JavaScript/TypeScript |
| External API Calls | No               | Yes                   |
| Complexity         | Limited by SQL   | Unlimited             |
| Performance        | Generally faster | May be slower         |
| Reusability        | Limited          | High                  |
| Debugging          | SQL errors only  | Full error handling   |
| Testability        | Difficult        | Easy to unit test     |

### Automatic Permission Initialization

ForgeDatabase can automatically initialize permissions for all tables in your database. This feature is useful when you want to ensure that all tables have at least basic permissions set.

#### Configuration

You can enable automatic permission initialization when creating the ForgeDatabase instance:

```typescript
const db = createForgeDatabase({
  db: knexInstance,
  // Enable automatic permission initialization
  initializePermissions: true,
  // Optional: Specify where to save the initialization report
  permissionReportPath: './permission-report.md',
  // Optional: Callback function when initialization completes
  onPermissionInitComplete: (report) => {
    console.log(`Initialized permissions for ${report.tablesInitialized} tables`);
  },
});
```

#### Manual Initialization

You can also manually trigger permission initialization at any time:

```typescript
// Initialize permissions with default options from config
db.initializePermissions();

// Or specify custom options
db.initializePermissions('./custom-report-path.md', (report) => {
  console.log('Permission initialization completed!');
  console.log(`Tables initialized: ${report.initializedTables.join(', ')}`);
});
```

#### How It Works

1. The initialization process runs in the background (non-blocking)
2. It retrieves all tables from the database
3. It filters out tables in the excludedTables list
4. For each table without permissions, it sets the default permissions
5. It generates a detailed report of the initialization process

#### Report Format

The report is generated as a markdown file with the following information:

- Start and end time of the initialization
- Total number of tables processed
- Number of tables that already had permissions
- Number of tables that had permissions initialized
- Number of tables excluded from initialization
- Lists of tables in each category
- Any errors that occurred during initialization

To use custom functions:

1. Register your functions at application startup
2. Reference them by name in your permission rules

```typescript
// Register functions during app initialization
import { rlsFunctionRegistry } from '@forgebase-ts/database';

rlsFunctionRegistry.register('myCustomCheck', async (userContext, row, knex) => {
  // Implement complex permission logic here
  // Can use async/await, make database queries, call external services, etc.
  return true; // Return true to grant access, false to deny
});

// Later, use the function in permission rules
await db.setPermissions('myTable', {
  operations: {
    UPDATE: [
      {
        allow: 'customFunction',
        customFunction: 'myCustomCheck',
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
