# ForgeBase Database SDK

A flexible and powerful database client for interacting with ForgeBase APIs, with seamless integration with ForgebaseAuth for authenticated requests.

## Features

- 🔄 Axios-based HTTP client for modern API interactions
- 🔒 Seamless integration with ForgebaseAuth for authenticated requests
- 🔁 Automatic token refresh when used with ForgebaseAuth
- 🔍 Fluent query builder for complex database operations
- 🧩 Type-safe API with TypeScript support
- 🚀 Support for filtering, sorting, pagination, and more

## Installation

```bash
npm install @forgebase/sdk
# or
yarn add @forgebase/sdk
```

## Basic Usage

### Standalone Usage

```typescript
import { DatabaseSDK } from '@forgebase/sdk';

// Create a new instance
const db = new DatabaseSDK('https://api.example.com');

// Fetch records
const users = await db.getRecords('users', {
  filter: { active: true },
  limit: 10,
  orderBy: [{ field: 'created_at', direction: 'desc' }],
});

// Create a record
const newUser = await db.createRecord('users', {
  name: 'John Doe',
  email: 'john@example.com',
});

// Update a record
const updatedUser = await db.updateRecord('users', 123, {
  name: 'John Smith',
});

// Delete a record
await db.deleteRecord('users', 123);
```

### Using with ForgebaseAuth

The DatabaseSDK can be used with the ForgebaseAuth SDK to make authenticated requests. This integration provides several benefits:

- **Automatic Authentication**: All requests include the authentication token
- **Token Refresh**: Expired tokens are automatically refreshed
- **Consistent Headers**: Authentication headers are consistently applied
- **Error Handling**: Authentication errors are properly handled

```typescript
import { DatabaseSDK } from '@forgebase/sdk';
import { ForgebaseAuth, SecureStoreAdapter } from '@forgebase/react-native-auth';
import * as SecureStore from 'expo-secure-store';

// Initialize auth
const secureStorage = new SecureStoreAdapter(SecureStore);
const auth = new ForgebaseAuth({
  apiUrl: 'https://api.example.com',
  storage: secureStorage,
});

// Login to get authenticated
await auth.login({
  email: 'user@example.com',
  password: 'password123',
});

// Option 1: Create a database SDK with the auth axios instance
const db = new DatabaseSDK('https://api.example.com', auth.api);

// Option 2: Create a database SDK with auth interceptors
const authInterceptors = auth.getAuthInterceptors();
const db2 = new DatabaseSDK('https://api.example.com', undefined, {}, authInterceptors);

// Now all database requests will include authentication headers
// and benefit from automatic token refresh
const myData = await db.getRecords('my_private_data');
```

#### Using in React Components with Hooks

```typescript
import React, { useEffect, useState } from 'react';
import { DatabaseSDK } from '@forgebase/sdk';
import { useAuth } from '@forgebase/react-native-auth';

function MyComponent() {
  const { getApi, isAuthenticated } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (isAuthenticated) {
        try {
          // Get the authenticated axios instance
          const api = getApi();

          // Create a database SDK with the auth axios instance
          const db = new DatabaseSDK('https://api.example.com', api);

          // Fetch data with authentication
          const result = await db.getRecords('my_data');
          setData(result.records || []);
        } catch (error) {
          console.error('Error fetching data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [isAuthenticated, getApi]);

  // Render component
}
```

## Query Builder

The SDK includes a fluent query builder for more complex queries:

```typescript
import { DatabaseSDK } from '@forgebase/sdk';

const db = new DatabaseSDK('https://api.example.com');

// Build a complex query
const results = await db.table('users').where('role', 'admin').where('status', 'active').whereIn('department', ['IT', 'HR']).orderBy('last_login', 'desc').limit(20).offset(0).query();

// Create a record
await db.table('posts').create({
  title: 'New Post',
  content: 'Post content',
  author_id: 123,
});

// Update a record
await db.table('posts').update(456, {
  title: 'Updated Title',
});

// Delete a record
await db.table('posts').delete(456);
```

## Authentication Integration

The DatabaseSDK can be integrated with ForgebaseAuth in two ways:

### 1. Using the Auth Axios Instance

```typescript
import { DatabaseSDK } from '@forgebase/sdk';
import { ForgebaseWebAuth } from '@forgebase/web-auth';

// Initialize auth
const auth = new ForgebaseWebAuth({ apiUrl: 'https://api.example.com' });

// Create a database SDK with the auth axios instance
const db = new DatabaseSDK('https://api.example.com', auth.api);
```

### 2. Using Auth Interceptors

```typescript
import { DatabaseSDK } from '@forgebase/sdk';
import { ForgebaseWebAuth } from '@forgebase/web-auth';

// Initialize auth
const auth = new ForgebaseWebAuth({ apiUrl: 'https://api.example.com' });

// Get auth interceptors
const authInterceptors = auth.getAuthInterceptors();

// Create a database SDK with auth interceptors
const db = new DatabaseSDK('https://api.example.com', undefined, { timeout: 5000 }, authInterceptors);
```

You can also apply auth interceptors to an existing DatabaseSDK instance:

```typescript
import { DatabaseSDK } from '@forgebase/sdk';
import { ForgebaseWebAuth } from '@forgebase/web-auth';

// Initialize auth and database
const auth = new ForgebaseWebAuth({ apiUrl: 'https://api.example.com' });
const db = new DatabaseSDK('https://api.example.com');

// Get auth interceptors and apply them
const authInterceptors = auth.getAuthInterceptors();
db.applyAuthInterceptors(authInterceptors);
```

## Axios Configuration

### Instance Configuration

You can pass custom axios configuration when creating a DatabaseSDK instance:

```typescript
// With custom axios config
const db = new DatabaseSDK(
  'https://api.example.com',
  undefined, // No auth instance
  {
    timeout: 5000,
    headers: {
      'X-Custom-Header': 'value',
    },
  }
);

// With auth instance and custom config
const db = new DatabaseSDK('https://api.example.com', auth.api, {
  timeout: 5000,
});
```

### Per-Request Configuration

You can also pass custom axios configuration for individual requests:

```typescript
// Custom config for a specific request
const users = await db.getRecords(
  'users',
  { limit: 10 },
  { execute: true },
  {
    timeout: 3000,
    headers: {
      'X-Custom-Header': 'value-for-this-request',
    },
  }
);

// Custom config with the query builder
const posts = await db.table('posts').where('status', 'published').query({
  timeout: 3000,
});
```

### Configuration Merging

When you provide axios configuration at different levels, they are merged as follows:

1. **Base Configuration**: Set when creating the axios instance (in constructor)
2. **Request Configuration**: Set when making a specific request

The merging follows these rules:

- Simple properties (like `timeout`) from the request config override the instance config
- For `headers`, the objects are merged, so request headers are added to or override specific instance headers
- When using ForgebaseAuth, authentication headers are always included

This allows you to:

- Set global defaults in the constructor
- Override specific settings for individual requests
- Maintain authentication when using ForgebaseAuth

## Error Handling

The SDK provides detailed error information:

```typescript
try {
  const result = await db.getRecords('users');
} catch (error) {
  if (axios.isAxiosError(error)) {
    console.error('API Error:', error.response?.data);
    console.error('Status:', error.response?.status);
  } else {
    console.error('Error:', error.message);
  }
}
```

## License

MIT
