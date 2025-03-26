# ForgeBase TypeScript SDK

A powerful, type-safe TypeScript SDK for interacting with ForgeBase services, providing comprehensive database operations, real-time features, and advanced query capabilities.

## Core Features

- **Type-Safe Query Builder**:

  - Fluent API design
  - Advanced filtering
  - Complex joins and relations
  - Aggregations and window functions
  - Transaction support
  - Raw query support
  - Query optimization

- **Database Operations**:

  - CRUD operations
  - Batch operations
  - Pagination
  - Sorting
  - Custom queries
  - Schema validation
  - Error handling

- **Security Features**:

  <!-- - JWKS support
  - Token validation
  - Request signing -->

  - Input sanitization
  - Type validation
  - Error boundaries
  <!-- - Rate limiting -->

- **Advanced Querying**:

  - Window functions
  - Common Table Expressions (CTEs)
  - Recursive queries
  - Complex filtering
  - Advanced joins
  - Subqueries
  - Aggregations

<!-- - **Real-time Features**:

  - Live queries
  - Change notifications
  - WebSocket integration
  - Presence tracking
  - Subscription management
  - Connection handling
  - Event buffering -->

<!-- - **Performance Features**:
  - Query caching
  - Connection pooling
  - Batch operations
  - Lazy loading
  - Query optimization
  - Result transformation
  - Memory management -->

## Installation

```bash
npm install @forgebase-ts/sdk
# or
yarn add @forgebase-ts/sdk
# or
pnpm add @forgebase-ts/sdk
```

## Basic Usage

### Database Operations

```typescript
import { DatabaseSDK } from '@forgebase-ts/sdk/client';

// Initialize with your API URL
const db = new DatabaseSDK('http://localhost:3000', {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Basic CRUD Operations
const users = await db
  .table('users')
  .select('id', 'name', 'email')
  .where('status', 'active')
  .execute({
    headers: {
      'some-stuff': 'true',
    },
  });

// Create a new record
const newUser = await db.table('users').create({
  name: 'John Doe',
  email: 'john@example.com',
  role: 'user',
});

// Update a record
await db.table('users').update(1, {
  status: 'inactive',
});

// Delete a record
await db.table('users').delete(1);
```

### Advanced Queries

```typescript
// Complex filtering with type safety
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  salary: number;
}

const results = await db
  .table<User>('users')
  .where('status', 'active')
  .andWhere((query) => {
    query.where('role', 'manager').where('department', 'IT').orWhere('salary', '>', 100000);
  })
  .orderBy('name', 'asc')
  .limit(10)
  .execute();

// Aggregations
const stats = await db.table<User>('users').groupBy('department').select('department').count('id', 'total_users').avg('salary', 'avg_salary').having('total_users', '>', 5).execute();

// Window Functions
const rankedUsers = await db
  .table<User>('users')
  .select('name', 'department', 'salary')
  .window('rank', 'salary_rank', {
    partitionBy: ['department'],
    orderBy: [{ field: 'salary', direction: 'desc' }],
  })
  .execute();

// Advanced Window Functions
const analysis = await db
  .table<User>('users')
  .windowAdvanced('sum', 'running_total', {
    field: 'salary',
    over: {
      partitionBy: ['department'],
      orderBy: [{ field: 'hire_date', direction: 'asc' }],
      frame: {
        type: 'ROWS',
        start: 'UNBOUNDED PRECEDING',
        end: 'CURRENT ROW',
      },
    },
  })
  .execute();
```

### CTEs and Recursive Queries

```typescript
// Simple CTE
const highPaidUsers = db.table<User>('users').where('salary', '>', 100000);

const result = await db.table<User>('users').with('high_paid', highPaidUsers).execute();

// Recursive CTE
interface Category {
  id: number;
  parent_id: number | null;
  name: string;
}

const categories = await db
  .table<Category>('categories')
  .withRecursive(
    'category_tree',
    // Initial query
    db.table('categories').where('parent_id', null),
    // Recursive query
    db.table('categories').join('category_tree', 'parent_id', 'id'),
    { unionAll: true }
  )
  .execute();
```

<!-- ### Real-time Subscriptions

```typescript
// Subscribe to changes
const unsubscribe = await db
  .table<User>('users')
  .where('department', 'IT')
  .subscribe({
    onAdd: (user) => console.log('New user:', user),
    onChange: (user) => console.log('User updated:', user),
    onDelete: (id) => console.log('User deleted:', id),
  });

// Later: cleanup subscription
unsubscribe();
``` -->

<!-- ### Security Features

```typescript
// JWKS Configuration
const db = new DatabaseSDK('http://localhost:3000', {
  auth: {
    jwksUrl: '/.well-known/jwks.json',
    audience: 'your-api',
    issuer: 'your-auth-server',
  },
});

// Request Signing
const db = new DatabaseSDK('http://localhost:3000', {
  security: {
    signRequests: true,
    privateKey: 'your-private-key',
    keyId: 'your-key-id',
  },
});

// Rate Limiting
const db = new DatabaseSDK('http://localhost:3000', {
  rateLimit: {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
  },
});
``` -->

## Error Handling

```typescript
try {
  const result = await db.table('users').where('id', 1).execute();
} catch (error) {
  if (error instanceof QueryError) {
    // Handle query-related errors
    console.error('Query Error:', error.message);
  } else if (error instanceof ValidationError) {
    // Handle validation errors
    console.error('Validation Error:', error.details);
  } else if (error instanceof AuthorizationError) {
    // Handle authorization errors
    console.error('Authorization Error:', error.message);
  } else {
    // Handle other errors
    console.error('Unknown Error:', error);
  }
}
```

<!--
## Advanced Configuration

```typescript
const db = new DatabaseSDK('http://localhost:3000', {
  // Authentication
  credentials: 'include',
  headers: {
    Authorization: 'Bearer your-token',
  },

  // Query Options
  queryConfig: {
    maxLimit: 1000,
    defaultLimit: 50,
    maxComplexity: 10,
  },

  // Cache Configuration
  cache: {
    enabled: true,
    ttl: 300, // 5 minutes
    maxSize: 100, // Maximum number of cached queries
  },

  // Real-time Configuration
  realtime: {
    enabled: true,
    reconnectDelay: 1000,
    maxRetries: 5,
  },

  // Performance Tuning
  performance: {
    batchSize: 1000,
    poolSize: 10,
    timeout: 5000,
  },
});
``` -->

## Type Safety

The SDK provides full TypeScript support with generic types:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Order {
  id: number;
  userId: number;
  total: number;
  status: string;
}

// Type-safe queries
const users = await db.table<User>('users').select('id', 'name', 'email').where('role', 'admin').execute();

// Type-safe joins
const orders = await db.table<Order>('orders').join<User>('users', 'userId', 'id').select('orders.id', 'users.name', 'orders.total').execute();
```

## Performance Optimization

### Query Optimization

```typescript
// Use select to limit returned fields
const users = await db.table('users').select('id', 'name').where('active', true).execute();

// Use indexes effectively
const result = await db
  .table('users')
  .where('email', 'user@example.com') // Assuming email is indexed
  .first()
  .execute();

// Batch operations (WIP*)
await db.table('users').createMany([
  { name: 'User 1', email: 'user1@example.com' },
  { name: 'User 2', email: 'user2@example.com' },
]);
```

<!-- ### Caching

```typescript
// Enable caching for specific queries
const users = await db
  .table('users')
  .cache({
    ttl: 300, // 5 minutes
    tags: ['users'],
  })
  .execute();

// Invalidate cache
await db.invalidateCache('users');
``` -->

## Building

Run `nx build sdk` to build the library.

## Running Tests

```bash
# Run unit tests
nx test sdk

# Run integration tests
nx test sdk --config=integration

# Run tests with coverage
nx test sdk --coverage
```

## License

MIT
