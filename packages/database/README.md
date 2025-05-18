# ForgeBase Database

A flexible, powerful database abstraction layer for ForgeBase, providing database operations, schema management, row-level security (RLS), and real-time capabilities.

## Features

- 🔄 **Multiple Database Support**: Works with SQLite, PostgreSQL, MySQL, MSSQL, and any Knex-compatible database
- 🔒 **Row-Level Security (RLS)**: Fine-grained access control at the row level
- 🔐 **Permission Management**: Role-based access control for tables and operations
- 📊 **Schema Management**: Create, modify, and delete tables and columns dynamically
- 🔍 **Query Builder**: Powerful query building with filtering, sorting, and pagination
- ⚡ **Real-time Updates**: Optional real-time database changes via WebSockets
- 🧩 **Type Safety**: Full TypeScript support with type definitions
- 🔌 **Adapter System**: Extensible adapter system for different database engines
- 🪝 **Event Hooks**: Before/After hooks for queries and mutations
- 🔎 **Database Inspection**: Retrieve complete database schema and structure
- 🔄 **Integration Options**: Use with API package, frontend SDK, REST API, or custom frameworks

## Installation

```bash
npm install @the-forgebase/database
# or
yarn add @the-forgebase/database
# or
pnpm add @the-forgebase/database
```

## Basic Usage

### Initialize the Database

```typescript
import { ForgeDatabase } from '@the-forgebase/database';
import knex from 'knex';

// Create a Knex instance
const knexInstance = knex({
  client: 'sqlite3',
  connection: {
    filename: './mydb.sqlite',
  },
  useNullAsDefault: true,
});

// Initialize ForgeDatabase
const db = new ForgeDatabase({
  db: knexInstance,
  enforceRls: true, // Enable row-level security
  realtime: true, // Enable real-time updates
});
```

### Schema Operations

```typescript
// Create a new table
await db.endpoints.schema.create({
  tableName: 'users',
  columns: [
    { name: 'id', type: 'increments', primary: true },
    { name: 'username', type: 'string', unique: true, nullable: false },
    { name: 'email', type: 'string', unique: true, nullable: false },
    { name: 'password', type: 'string', nullable: false },
    { name: 'role', type: 'string', defaultValue: 'user' },
    { name: 'created_at', type: 'timestamp', defaultToNow: true },
  ],
});

// Get database schema
const schema = await db.endpoints.schema.get();
console.log(schema);

// Modify a table
await db.endpoints.schema.modify({
  tableName: 'users',
  addColumns: [{ name: 'last_login', type: 'timestamp', nullable: true }],
  dropColumns: ['unused_column'],
  modifyColumns: [{ name: 'role', type: 'string', defaultValue: 'member' }],
});
```

### Data Operations

```typescript
// Query data
const users = await db.endpoints.data.query(
  'users',
  {
    select: ['id', 'username', 'email', 'role'],
    where: { role: 'admin' },
    orderBy: [{ column: 'created_at', direction: 'desc' }],
    limit: 10,
    offset: 0,
  },
  { id: 1, role: 'admin' }, // User context for RLS
);

// Create data
const newUser = await db.endpoints.data.create(
  {
    tableName: 'users',
    data: {
      username: 'johndoe',
      email: 'john@example.com',
      password: 'hashedpassword',
      role: 'user',
    },
  },
  { id: 1, role: 'admin' }, // User context for RLS
);

// Update data
await db.endpoints.data.update(
  {
    tableName: 'users',
    id: 1,
    data: {
      role: 'moderator',
    },
  },
  { id: 1, role: 'admin' }, // User context for RLS
);

// Delete data
await db.endpoints.data.delete(
  {
    tableName: 'users',
    id: 1,
  },
  { id: 1, role: 'admin' }, // User context for RLS
);
```

### Permissions Management

```typescript
// Get permissions for a table
const permissions = await db.getPermissionService().getPermissionsForTable('users');

// Set permissions for a table
await db.setPermissions('users', {
  operations: {
    SELECT: [
      // Allow authenticated users to see their own data
      {
        allow: 'auth',
        fieldCheck: {
          field: 'id',
          operator: '===',
          valueType: 'userContext',
          value: 'userId',
        },
      },
      // Allow admins and moderators to see all data
      {
        allow: 'role',
        roles: ['admin', 'moderator'],
      },
      // Allow users with specific labels
      {
        allow: 'labels',
        labels: ['user_manager'],
      },
      // Allow users in specific teams
      {
        allow: 'teams',
        teams: ['support_team'],
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
        allow: 'auth',
        fieldCheck: {
          field: 'id',
          operator: '===',
          valueType: 'userContext',
          value: 'userId',
        },
      },
      // Admins and moderators can update any user
      {
        allow: 'role',
        roles: ['admin', 'moderator'],
      },
    ],
    DELETE: [
      // Only admins can delete users
      {
        allow: 'role',
        roles: ['admin'],
      },
      // Custom SQL condition for complex rules
      {
        allow: 'customSql',
        customSql: `
          SELECT 1 WHERE
            EXISTS (SELECT 1 FROM user_managers WHERE manager_id = :userId AND user_id = users.id)
        `,
      },
    ],
  },
});
```

### Transactions

ForgeBase Database supports transactions to ensure data consistency and atomicity. All database operations support transactions, allowing you to perform multiple operations as a single unit of work.

There are two ways to use transactions:

#### Explicit Transactions

Pass a transaction object to each method:

```typescript
// Execute operations in a transaction
await db.transaction(async (trx) => {
  // Create a user
  const user = await db.endpoints.data.create(
    {
      tableName: 'users',
      data: { username: 'jane', email: 'jane@example.com', password: 'hashedpw' },
    },
    { id: 1, role: 'admin' },
    false, // Not a system operation
    trx, // Pass the transaction
  );

  // Create a profile for the user
  await db.endpoints.data.create(
    {
      tableName: 'profiles',
      data: { user_id: user.id, bio: 'New user' },
    },
    { id: 1, role: 'admin' },
    false,
    trx,
  );
});
```

#### Implicit Transactions

Many methods automatically create a transaction if one isn't provided:

```typescript
// This will automatically create a transaction internally
const user = await db.endpoints.data.create(
  {
    tableName: 'users',
    data: { username: 'john', email: 'john@example.com', password: 'hashedpw' },
  },
  { id: 1, role: 'admin' },
);
```

## Security Best Practices

### Row-Level Security (RLS)

ForgeBase Database provides powerful row-level security capabilities that allow you to define fine-grained access control rules at the row level. There are several ways to implement RLS:

#### Basic RLS with Field Checks

```typescript
// Enable RLS
const db = new ForgeDatabase({
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

#### Advanced RLS with Custom SQL

For complex permission rules that require database queries:

```typescript
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
```

#### Advanced RLS with Custom Functions

For the most flexible permission rules, you can register custom JavaScript functions:

```typescript
// Register a custom RLS function
import { rlsFunctionRegistry } from '@the-forgebase/database';

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

### Automatic Permission Initialization

ForgeBase Database can automatically initialize permissions for all tables in your database. This feature is useful when you want to ensure that all tables have at least basic permissions set.

#### Configuration

You can enable automatic permission initialization when creating the ForgeDatabase instance:

```typescript
const db = new ForgeDatabase({
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

### Real-time Updates

When enabled, ForgeBase Database can provide real-time updates via WebSockets:

```typescript
// Enable real-time updates when initializing
const db = new ForgeDatabase({
  db: knexInstance,
  realtime: true,
  websocketPort: 8080, // Optional, defaults to 8080
});

// The WebSocket server will automatically broadcast changes to connected clients
```

## Frontend Integration

ForgeBase Database can be easily integrated with frontend applications using the `@the-forgebase/sdk` package:

```typescript
// Initialize the SDK with your API URL
import { DatabaseSDK } from '@the-forgebase/sdk/client';

const db = new DatabaseSDK({
  baseUrl: 'http://localhost:3000/api',
  axiosConfig: {
    withCredentials: true, // Important for auth cookies
  },
});

// Query data with a fluent API
const users = await db.table('users').select('id', 'name', 'email').where('status', 'active').orderBy('name', 'asc').query();

// Create a new record
const newUser = await db.table('users').create({
  name: 'John Doe',
  email: 'john@example.com',
  role: 'user',
});

// Update a record
await db.table('users').update(123, {
  name: 'John Smith',
});

// Delete a record
await db.table('users').delete(123);

// Real-time updates
const unsubscribe = db.table('users').subscribe((event) => {
  if (event.type === 'create') {
    console.log('New user created:', event.record);
  } else if (event.type === 'update') {
    console.log('User updated:', event.record);
  } else if (event.type === 'delete') {
    console.log('User deleted:', event.id);
  }
});

// Later, unsubscribe when no longer needed
unsubscribe();
```

For more details on integration options, see the [Complete Integration](/database/complete-integration) guide.

## API Reference

For detailed API documentation, please refer to the [ForgeBase Documentation](https://docs.forgebase.dev/database).

## License

[MIT](https://github.com/The-ForgeBase/forgebase-ts/blob/main/LICENSE)
