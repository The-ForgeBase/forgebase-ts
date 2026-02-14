# ForgeBase Database

A flexible, powerful database abstraction layer for ForgeBase, built on top of [Kysely](https://kysely.dev/). It provides type-safe database operations, schema management, row-level security (RLS), and real-time capabilities.

## Features

- 🔄 **Multiple Database Support**: Works with SQLite (via Better-SQLite3 or LibSQL), PostgreSQL, MySQL, and other Kysely-supported dialects.
- 🔒 **Row-Level Security (RLS)**: Fine-grained access control at the row level.
- 🔐 **Permission Management**: Role-based, team-based, and label-based access control.
- 📊 **Schema Management**: Create, modify, and delete tables and columns dynamically.
- 🔍 **Query Builder**: Powerful query building with filtering, sorting, and pagination.
- ⚡ **Real-time Updates**: Optional real-time database changes via WebSockets or SSE.
- 🧩 **Type Safety**: Full TypeScript support.
- 🪝 **Event Hooks**: Pre/Post hooks for queries and mutations (handled internally).
- 🔎 **Database Inspection**: Retrieve database schema and structure.

## Installation

```bash
npm install @forgebase/database kysely
# Install a driver, for example:
npm install better-sqlite3
# or
npm install @libsql/client
# or
npm install pg
```

## Basic Usage

### Initialize the Database

You can initialize `ForgeDatabase` with a Kysely instance or with specific configuration for LibSQL.

#### Option 1: Using an existing Kysely instance

```typescript
import { ForgeDatabase } from '@forgebase/database';
import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';

// Initialize Kysely
const db = new Kysely({
  dialect: new SqliteDialect({
    database: new Database('managed.db'),
  }),
});

// Initialize ForgeDatabase
const forgeDb = new ForgeDatabase({
  db: db,
  enforceRls: true, // Enable row-level security
  realtime: true, // Enable real-time updates
});
```

#### Option 2: Using LibSQL Configuration

```typescript
import { ForgeDatabase } from '@forgebase/database';

const forgeDb = new ForgeDatabase({
  libsql: {
    url: 'file:local.db',
    // or
    // url: 'libsql://your-database.turso.io',
    // authToken: 'your-auth-token'
  },
  enforceRls: true,
});
```

### Schema Operations

```typescript
// Create a new table
await forgeDb.endpoints.schema.create({
  tableName: 'users',
  columns: [
    { name: 'id', type: 'increments', primary: true, nullable: false },
    { name: 'username', type: 'string', unique: true, nullable: false },
    { name: 'email', type: 'string', unique: true, nullable: false },
    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', nullable: false },
  ],
});

// Get database schema
const schema = await forgeDb.endpoints.schema.get();
console.log(schema);

// Modify a table (Add/Update/Delete columns)
// Note: 'action' is one of 'addColumn', 'deleteColumn', 'updateColumn'
await forgeDb.endpoints.schema.modify({
  tableName: 'users',
  action: 'addColumn',
  columns: [{ name: 'last_login', type: 'string', nullable: true }],
});
```

### Data Operations

All data operations can optionally take a `UserContext` for RLS enforcement and a `Transaction`.

```typescript
// Query data
const users = await forgeDb.endpoints.data.query(
  'users',
  {
    select: ['id', 'username', 'email'],
    where: { role: 'admin' },
    orderBy: [{ column: 'created_at', direction: 'desc' }],
    limit: 10,
    offset: 0,
  },
  { userId: 1, role: 'admin', labels: [], teams: [] }, // User context for RLS
);

// Create data
const newUser = await forgeDb.endpoints.data.create(
  {
    tableName: 'users',
    data: {
      username: 'johndoe',
      email: 'john@example.com',
      role: 'user',
    },
  },
  { userId: 1, role: 'admin', labels: [], teams: [] }, // User context
);

// Update data
await forgeDb.endpoints.data.update(
  {
    tableName: 'users',
    id: 1,
    data: {
      role: 'moderator',
    },
  },
  { userId: 1, role: 'admin', labels: [], teams: [] },
);

// Delete data
await forgeDb.endpoints.data.delete(
  {
    tableName: 'users',
    id: 1,
  },
  { userId: 1, role: 'admin', labels: [], teams: [] },
);
```

### Permissions Management

You can define granular permissions for tables.

```typescript
// Get permissions for a table
const permissions = await forgeDb.getPermissionService().getPermissionsForTable('users');

// Set permissions for a table
await forgeDb.getPermissionService().setPermissionsForTable('users', {
  operations: {
    SELECT: [
      // Allow authenticated users to see their own data
      {
        allow: 'fieldCheck',
        fieldCheck: {
          field: 'id',
          operator: '===',
          valueType: 'userContext',
          value: 'userId',
        },
      },
      // Allow admins to see all data
      {
        allow: 'role',
        roles: ['admin'],
      },
    ],
    INSERT: [
      // Only admins can create users
      {
        allow: 'role',
        roles: ['admin'],
      },
    ],
    UPDATE: [
      // Users can update their own data
      {
        allow: 'auth', // 'auth' generally means "authenticated", but combine with checks if needed,
        // or use specific rules like 'fieldCheck'
        fieldCheck: {
          field: 'id',
          operator: '===',
          valueType: 'userContext',
          value: 'userId',
        },
      },
    ],
    DELETE: [
      {
        allow: 'role',
        roles: ['admin'],
      },
    ],
  },
});
```

### Transactions

You can execute operations within a transaction using the `transaction` method.

```typescript
await forgeDb.transaction(async (trx) => {
  // Pass 'trx' to operations
  const user = await forgeDb.endpoints.data.create(
    {
      tableName: 'users',
      data: { username: 'jane', email: 'jane@example.com' },
    },
    { userId: 1, role: 'admin', labels: [], teams: [] },
    false, // isSystem
    trx, // Pass the transaction object
  );

  await forgeDb.endpoints.data.create(
    {
      tableName: 'profiles',
      data: { user_id: user[0].id, bio: 'New user' },
    },
    { userId: 1, role: 'admin', labels: [], teams: [] },
    false,
    trx,
  );
});
```

### Real-time Updates

> ⚠️ **Note**: The Real-time / WebSocket feature is currently experimental and under active development. It has not been fully tested in production environments yet. Use with caution.

Enable real-time updates to broadcast database changes.

```typescript
const forgeDb = new ForgeDatabase({
  db: kyselyInstance,
  realtime: true,
  realtimeAdapter: 'websocket', // or 'sse'
  websocketPort: 9001,
});
```

## License

MIT
