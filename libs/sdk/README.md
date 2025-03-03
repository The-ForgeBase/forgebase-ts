# ForgeBase TypeScript SDK

A powerful and flexible TypeScript SDK for interacting with the ForgeBase database and services.

## Installation

```bash
npm install @forgebase-ts/sdk
# or
yarn add @forgebase-ts/sdk
# or
pnpm add @forgebase-ts/sdk
```

## Basic Usage

```typescript
import { DatabaseSDK } from '@forgebase-ts/sdk/client';

// Initialize the SDK with your API base URL
const db = new DatabaseSDK('http://localhost:3000');

// Fetch records with a simple query
const users = await db.table('users').where('status', 'active').execute();

console.log(users.records);
```

## Authentication and Custom Headers

You can pass custom fetch options when initializing the SDK:

```typescript
// Initialize with authentication headers
const db = new DatabaseSDK('http://localhost:3000', {
  headers: {
    Authorization: 'Bearer your-token-here',
    'Content-Type': 'application/json',
  },
});
```

You can also update the default fetch options after initialization:

```typescript
// Update the default fetch options
db.setDefaultFetchOptions({
  headers: {
    Authorization: 'Bearer updated-token',
  },
});
```

## Per-Request Options

You can pass custom fetch options for individual requests:

```typescript
// Pass fetch options to a specific query
const users = await db
  .table('users')
  .where('status', 'active')
  .execute({
    headers: {
      'X-Custom-Header': 'value',
    },
  });

// Create a record with custom fetch options
const newUser = await db.table('users').create(
  {
    name: 'John Doe',
    email: 'john@example.com',
  },
  {
    headers: {
      'X-Custom-Header': 'value',
    },
  }
);

// Update a record with custom fetch options
await db.table('users').update(
  123,
  { status: 'inactive' },
  {
    headers: {
      'X-Custom-Header': 'value',
    },
  }
);

// Delete a record with custom fetch options
await db.table('users').delete(123, {
  headers: {
    'X-Custom-Header': 'value',
  },
});
```

## Query Builder API

### Basic Queries

```typescript
// Select all active users
const activeUsers = await db.table('users').where('status', 'active').execute();

// Select with complex conditions
const filteredUsers = await db.table('users').where('age', '>=', 18).where('status', 'active').execute();

// Select specific fields
const userEmails = await db.table('users').select('id', 'email').execute();
```

### Filtering

```typescript
// AND/OR conditions
const users = await db
  .table('users')
  .where('status', 'active')
  .andWhere((query) => {
    query.where('role', 'admin').orWhere((subQuery) => {
      subQuery.where('role', 'manager').where('department', 'IT');
    });
  })
  .execute();

// Between, In, Null
const examples = {
  between: await db.table('users').whereBetween('salary', [50000, 100000]).execute(),

  whereIn: await db.table('users').whereIn('department', ['IT', 'HR', 'Finance']).execute(),

  whereNull: await db.table('users').whereNull('deletedAt').execute(),
};

// Exists with subqueries (SQL injection safe)
const usersWithOrders = await db
  .table('users')
  .whereExists((subquery) => subquery.table('orders').where('total', '>', 1000))
  .execute();
```

### Aggregations

```typescript
// Basic aggregation
const stats = await db.table('orders').groupBy('status').count('id', 'order_count').sum('total', 'total_amount').avg('total', 'average_amount').execute();

// Having clause
const highValueGroups = await db.table('orders').groupBy('userId').having('total_amount', '>', 1000).sum('total', 'total_amount').execute();
```

### Advanced Features

```typescript
// Window functions
const rankedUsers = await db
  .table('users')
  .select('firstName', 'department', 'salary')
  .window('rank', 'salary_rank', {
    partitionBy: ['department'],
    orderBy: [{ field: 'salary', direction: 'desc' }],
  })
  .execute();

// CTEs (Common Table Expressions)
const highPaidUsers = db.table('users').where('salary', '>', 100000);

const result = await db.table('users').with('high_paid', highPaidUsers).execute();
```

## Building

Run `nx build sdk` to build the library.

## Running unit tests

Run `nx test sdk` to execute the unit tests via [Jest](https://jestjs.io).
