# ForgeBase TypeScript SDK

A powerful, type-safe TypeScript SDK for interacting with ForgeBase services, providing comprehensive database operations, advanced query capabilities, and type safety.

## Core Features

- **Type-Safe Query Builder**:
  - Fluent API design
  - Advanced filtering (`where`, `whereIn`, `whereExists`, etc.)
  - Complex joins and relations
  - Aggregations (`count`, `sum`, `avg`, `min`, `max`)
  - Window functions (`rowNumber`, `rank`, `lag`, `lead`)
  - Recursive CTEs
  - Result transformations (`pivot`, `compute`)

- **Database Operations**:
  - CRUD operations (`create`, `update`, `delete`)
  - Batch operations
  - Pagination (`limit`, `offset`)
  - Sorting (`orderBy`)

- **Security & Validation**:
  - Input validation
  - Type inference from your interfaces

## Installation

```bash
npm install @forgebase/sdk
# or
yarn add @forgebase/sdk
# or
pnpm add @forgebase/sdk
```

## Basic Usage

### Initialization

```typescript
import { DatabaseSDK } from '@forgebase/sdk/client';

// Initialize with your API URL
const db = new DatabaseSDK({
  baseUrl: 'http://localhost:3000',
  axiosConfig: {
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  },
});
```

### Database Operations

```typescript
// Define your entity type
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
}

// simple query
const users = await db.table<User>('users').select('id', 'name', 'email').where('status', 'active').query();

// Create a new record
const newUser = await db.table<User>('users').create({
  name: 'John Doe',
  email: 'john@example.com',
  role: 'user',
  status: 'active',
});

// Update a record by ID
await db.table<User>('users').update(1, {
  status: 'inactive',
});

// Delete a record by ID
await db.table<User>('users').delete(1);
```

### Advanced Queries

```typescript
// Complex filtering
const results = await db
  .table<User>('users')
  .where('status', 'active')
  .andWhere((query) => {
    query.where('role', 'admin').orWhere('email', 'like', '%@company.com');
  })
  .orderBy('name', 'asc')
  .limit(10)
  .query();

// Aggregations
const stats = await db.table('orders').groupBy('status').sum('amount', 'total_amount').count('id', 'order_count').having('total_amount', '>', 5000).query();

// Window Functions
const rankedUsers = await db
  .table('users')
  .select('name', 'department', 'salary')
  .rank('salary_rank', ['department'], [{ field: 'salary', direction: 'desc' }])
  .query();

// Recursive CTEs (e.g., for hierarchical data)
const categories = await db
  .table('categories')
  .withRecursive(
    'category_tree',
    // Initial query
    db.table('categories').where('parent_id', null),
    // Recursive query
    db.table('categories').join('category_tree', 'parent_id', 'id'),
    { unionAll: true },
  )
  .query();
```

### Transformations

You can transform the result set on the client side using `pivot` or `compute`.

```typescript
// Pivot data
const pivoted = await db.table('sales').pivot('month', ['Jan', 'Feb', 'Mar'], { type: 'sum', field: 'amount' }).query();

// Compute new fields
const computed = await db
  .table('employees')
  .compute({
    fullName: (row) => `${row.firstName} ${row.lastName}`,
    tax: (row) => row.salary * 0.2,
  })
  .query();
```

## Error Handling

The SDK throws standard errors that you can catch and handle.

```typescript
try {
  await db.table('users').create(data);
} catch (error) {
  console.error('Failed to create user:', error.message);
}
```

## Real-time Updates

> ⚠️ **Note**: Real-time features (WebSockets/SSE) are currently experimental and under active development. They are not yet fully documented or recommended for production use.

## License

MIT
