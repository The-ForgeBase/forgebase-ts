# ForgeBase API

A flexible, framework-agnostic API library for building robust backend services with built-in database and storage capabilities. This library provides a unified interface for handling HTTP requests, database operations, and file storage across various Node.js frameworks.

## Purpose

ForgeBase API serves as a bridge between your application and ForgeBase services, providing:

1. **Unified Interface**: A consistent way to interact with ForgeBase services regardless of the framework you're using
2. **Framework Integrations**: Built-in support for popular frameworks through core modules:
   - Express (`@the-forgebase/api/core/express`)
   - NestJS (`@the-forgebase/api/core/nest`)
   - Web (`@the-forgebase/api/core/web`) for Hono, Next.js, and other web standard frameworks
   - Ultimate Express (`@the-forgebase/api/core/ultimate-express`)
3. **Database Access**: Direct access to ForgeBase Database with full support for schema management, data operations, and row-level security
4. **Storage Integration**: Access to ForgeBase Storage for file management
5. **Authentication Support**: Integration with ForgeBase Auth for user authentication and authorization

## Core Features

- **Framework Integration**:

  - Express integration for traditional Node.js applications
  - NestJS modules (ForgeApiModule and ForgeApiWithChildModule) for NestJS applications
  - Web integration for edge-compatible applications (Hono, Next.js, etc.)
  - Ultimate Express integration for Express applications with additional features
  - Web Standard support for any framework using standard Request/Response objects

- **Database Operations**:

  - CRUD operations with type safety
  - Schema management with support for various column types
  - Query builder with filtering, pagination, and sorting
  - Real-time updates via WebSockets (optional)
  - Row-level security (RLS) with fine-grained access control
  - Comprehensive permission management

- **REST API Endpoints**:

  - Schema endpoints for database schema management
  - Data endpoints for CRUD operations
  - Permission endpoints for row-level security management

- **Request Handling**:

  - Unified request/response interface across frameworks
  - Parameter parsing for route parameters, query strings, and request bodies
  - Content negotiation with support for different content types
  - Error handling with standardized error responses
  - Cookie support for session management

- **Security Features**:

  - Authentication integration with ForgeBase Auth
  - Row-level security enforcement based on user context
  - CORS support for cross-origin requests
  - Input validation and sanitization
  - Admin protection for administrative operations

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
  - [Core API Setup](#core-api-setup)
- [Framework Integration](#framework-integration)
  - [Express](/core/express)
  - [NestJS](/core/nest)
  - [Web](/core/web) (Hono, Next.js, Web Standard)
  - [Ultimate Express](/core/ultimate-express)
- [Database Operations](#database-operations)
- [Schema Management](#schema-management)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [REST API Reference](#rest-api-reference)
- [API Reference](#api-reference)
  - [ForgeApi Class](#forgeapi-class)
  - [ServerAdapter Interface](#serveradapter-interface)
  - [Configuration Types](#configuration-types)
- [Documentation](#documentation)
- [License](#license)

## Installation

```bash
npm install @the-forgebase/api @the-forgebase/database knex
# Install database driver based on your needs
npm install better-sqlite3 # for SQLite
# or
npm install pg # for PostgreSQL
# or
npm install mysql2 # for MySQL
```

## Basic Usage

### Core API Setup

```typescript
import knex from 'knex';

// Create a Knex instance
const knexInstance = knex({
  client: 'sqlite3',
  connection: {
    filename: './mydb.sqlite',
  },
  useNullAsDefault: true,
});
```

## Framework Integration

ForgeBase API is designed to work with any web framework through its adapter system. Below are examples of integrating with popular frameworks.

### Express Integration

```typescript
import express from 'express';
import cors from 'cors';
import { createExpressHandler } from '@the-forgebase/api/core/express';
import knex from 'knex';

// Create a Knex instance
const knexInstance = knex({
  client: 'sqlite3',
  connection: {
    filename: './mydb.sqlite',
  },
  useNullAsDefault: true,
});

// Create Express app
const app = express();

// Configure middleware
app.use(
  cors({
    origin: 'http://localhost:5173', // Your frontend URL
    credentials: true,
  }),
);
app.use(express.json());

// Create Express handler
const expressHandler = createExpressHandler({
  config: {
    enableSchemaEndpoints: true,
    enableDataEndpoints: true,
    enablePermissionEndpoints: true,
  },
  fgConfig: {
    prefix: '/api',
    services: {
      db: {
        provider: 'sqlite',
        config: {
          db: knexInstance,
          enforceRls: true,
        },
      },
    },
  },
});

// Mount the ForgeBase API
app.use('/api', expressHandler.getRouter());

// Add your custom routes
app.get('/hello', (req, res) => {
  res.json({ message: 'Hello, World!' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### NestJS Integration

ForgeBase API provides dedicated modules for NestJS integration:

```typescript
import { Module } from '@nestjs/common';
import { ForgeApiModule } from '@the-forgebase/api/core/nest';

@Module({
  imports: [
    ForgeApiModule.forRoot({
      prefix: '/api',
      services: {
        db: {
          provider: 'sqlite',
          config: {
            filename: './mydb.sqlite',
            enforceRls: true,
          },
        },
      },
    }),
    // Your other modules...
  ],
})
export class AppModule {}
```

For more advanced scenarios, you can use the `ForgeApiWithChildModule`:

```typescript
import { Module } from '@nestjs/common';
import { ForgeApiWithChildModule } from '@the-forgebase/api/core/nest';

// Root module with global configuration
@Module({
  imports: [
    ForgeApiWithChildModule.forRoot({
      prefix: '/api',
      services: {
        db: {
          provider: 'sqlite',
          config: {
            filename: './mydb.sqlite',
            enforceRls: true,
          },
        },
      },
    }),
    // Your other modules...
  ],
})
export class AppModule {}

// Feature module with its own configuration
@Module({
  imports: [
    ForgeApiWithChildModule.forChild({
      prefix: '/feature-api',
      services: {
        db: {
          provider: 'sqlite',
          config: {
            filename: './feature-database.sqlite',
            enforceRls: false,
          },
        },
      },
    }),
  ],
})
export class FeatureModule {}
```

### Hono Integration

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createIttyHandler } from '@the-forgebase/api/core/web';
import knex from 'knex';

// Create a Knex instance
const knexInstance = knex({
  client: 'sqlite3',
  connection: {
    filename: './mydb.sqlite',
  },
  useNullAsDefault: true,
});

// Create Hono app
const app = new Hono();

// Configure middleware
app.use(
  '*',
  cors({
    origin: 'http://localhost:5173', // Your frontend URL
    credentials: true,
  }),
);

// Create web handler
const webHandler = createIttyHandler({
  config: {
    enableSchemaEndpoints: true,
    enableDataEndpoints: true,
    enablePermissionEndpoints: true,
    corsEnabled: true,
  },
  fgConfig: {
    prefix: '/api',
    services: {
      db: {
        provider: 'sqlite',
        config: {
          db: knexInstance,
          enforceRls: true,
        },
      },
    },
  },
});

// Apply ForgeBase API to specific routes
app.all('/api/*', async (c) => {
  try {
    return await webHandler.handleRequest(c.req.raw);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Export for serverless environments
export default {
  port: 3000,
  fetch: app.fetch,
};
```

### Next.js Integration

```typescript
// app/api/[[...route]]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createIttyHandler } from '@the-forgebase/api/core/web';
import knex from 'knex';

// Create a Knex instance (you might want to use a singleton pattern in a real app)
const knexInstance = knex({
  client: 'sqlite3',
  connection: {
    filename: './mydb.sqlite',
  },
  useNullAsDefault: true,
});

// Create web handler
const webHandler = createIttyHandler({
  config: {
    enableSchemaEndpoints: true,
    enableDataEndpoints: true,
    enablePermissionEndpoints: true,
    corsEnabled: true,
  },
  fgConfig: {
    prefix: '/api',
    services: {
      db: {
        provider: 'sqlite',
        config: {
          db: knexInstance,
          enforceRls: true,
        },
      },
    },
  },
});

// Handle API requests
export async function GET(request: NextRequest) {
  return handleApiRequest(request);
}

export async function POST(request: NextRequest) {
  return handleApiRequest(request);
}

export async function PUT(request: NextRequest) {
  return handleApiRequest(request);
}

export async function DELETE(request: NextRequest) {
  return handleApiRequest(request);
}

async function handleApiRequest(request: NextRequest) {
  try {
    // Use the web handler to process the request
    const response = await webHandler.handleRequest(request);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Web Standard Integration

```typescript
import { createIttyHandler } from '@the-forgebase/api/core/web';
import knex from 'knex';

// Create a Knex instance
const knexInstance = knex({
  client: 'sqlite3',
  connection: {
    filename: './mydb.sqlite',
  },
  useNullAsDefault: true,
});

// Create web handler
const webHandler = createIttyHandler({
  config: {
    enableSchemaEndpoints: true,
    enableDataEndpoints: true,
    enablePermissionEndpoints: true,
    corsEnabled: true,
  },
  fgConfig: {
    prefix: '/api',
    services: {
      db: {
        provider: 'sqlite',
        config: {
          db: knexInstance,
          enforceRls: true,
        },
      },
    },
  },
});

// Handle requests
async function handleRequest(request: Request): Promise<Response> {
  try {
    // Check if the request is for the API
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api')) {
      return await webHandler.handleRequest(request);
    }

    // Handle other requests
    return new Response('Not Found', { status: 404 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Export for serverless environments
export default {
  fetch: handleRequest,
};
```

## Database Operations

ForgeBase API provides a complete interface to ForgeBase Database, allowing you to perform various database operations:

```typescript
// Get the database service
const db = expressHandler.getDatabaseService();

// Create a new record
const id = await db.insert(
  'users',
  {
    tableName: 'users',
    data: {
      name: 'John Doe',
      email: 'john@example.com',
    },
  },
  userContext, // Optional user context for row-level security
);

// Query records
const users = await db.query(
  'users',
  {
    select: ['id', 'name', 'email'],
    filter: { name: 'John' },
    limit: 10,
    offset: 0,
    orderBy: [{ column: 'name', order: 'asc' }],
  },
  userContext,
);

// Update a record by ID
await db.update(
  'users',
  {
    tableName: 'users',
    id: 1,
    data: {
      name: 'John Smith',
    },
  },
  userContext,
);

// Advanced update with filter
await db.advanceUpdate(
  {
    tableName: 'users',
    query: {
      filter: { status: 'inactive' },
    },
    data: {
      status: 'active',
    },
  },
  userContext,
);

// Delete a record by ID
await db.delete('users', 1, userContext);

// Advanced delete with filter
await db.advanceDelete(
  {
    tableName: 'users',
    query: {
      filter: { status: 'inactive' },
    },
  },
  userContext,
);
```

## Schema Management

ForgeBase API provides a complete interface for managing your database schema:

```typescript
// Get the database service
const db = expressHandler.getDatabaseService();

// Create a new table
await db.createSchema('users', [
  { name: 'id', type: 'increments', primary: true },
  { name: 'name', type: 'string' },
  { name: 'email', type: 'string', unique: true },
  { name: 'age', type: 'integer', nullable: true },
  { name: 'created_at', type: 'timestamp', defaultToNow: true },
]);

// Add columns to an existing table
await db.addColumn('users', [
  { name: 'phone', type: 'string', nullable: true },
  { name: 'address', type: 'string', nullable: true },
]);

// Add a foreign key to a table
await db.addForeignKey('posts', {
  column: 'author_id',
  references: {
    table: 'users',
    column: 'id',
  },
});

// Set permissions for a table
await db.setPermissions('users', {
  operations: {
    SELECT: [{ allow: 'public' }],
    INSERT: [{ allow: 'auth' }],
    UPDATE: [
      {
        allow: 'auth',
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

## Authentication

ForgeBase API integrates seamlessly with ForgeBase Auth to provide authentication and authorization:

```typescript
// Extract user context from request
const userContext = {
  userId: 1,
  role: 'admin',
  teams: ['team1'],
  labels: ['admin'],
};

// Use user context for database operations
const posts = await db.query(
  'posts',
  {
    select: ['id', 'title', 'content'],
    filter: { is_published: true },
  },
  userContext, // Pass user context for row-level security
);

// Set permissions for a table
await db.setPermissions('posts', {
  operations: {
    SELECT: [
      // Allow anyone to read published posts
      {
        allow: 'customSql',
        customSql: 'SELECT 1 FROM posts WHERE is_published = true',
      },
      // Allow users to read their own posts
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
      // Allow authenticated users to create posts
      {
        allow: 'auth',
      },
    ],
    UPDATE: [
      // Allow users to update their own posts
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
      // Allow users to delete their own posts
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

## Error Handling

ForgeBase API provides comprehensive error handling:

```typescript
try {
  const users = await db.query('users', {}, userContext);
} catch (error) {
  if (error instanceof AuthenticationRequiredError) {
    // User is not authenticated
    console.error('Authentication required');
  } else if (error instanceof PermissionDeniedError) {
    // User doesn't have permission
    console.error('Permission denied');
  } else if (error instanceof ExcludedTableError) {
    // Table doesn't exist or is excluded
    console.error('Table does not exist');
  } else if (error instanceof ValidationError) {
    // Input validation failed
    console.error('Validation error:', error.message);
  } else if (error instanceof DatabaseError) {
    // Database operation failed
    console.error('Database error:', error.message);
  } else {
    // Other error
    console.error('Error:', error.message);
  }
}
```

## REST API Reference

ForgeBase API automatically creates RESTful endpoints for your database:

### Schema Endpoints

```http
# Get database schema
GET /api/db/schema

# Get tables
GET /api/db/schema/tables

# Get table schema
GET /api/db/schema/tables/:tableName

# Create table
POST /api/db/schema
Content-Type: application/json

{
  "tableName": "users",
  "columns": [
    { "name": "id", "type": "increments", "primary": true },
    { "name": "name", "type": "string" },
    { "name": "email", "type": "string", "unique": true }
  ]
}

# Delete table
DELETE /api/db/schema/tables/:tableName
```

### Data Endpoints

```http
# Create record
POST /api/db/create/:tableName
Content-Type: application/json

{
  "data": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}

# Query records
POST /api/db/query/:tableName
Content-Type: application/json

{
  "query": {
    "select": ["id", "name", "email"],
    "filter": { "name": "John" },
    "limit": 10,
    "offset": 0,
    "orderBy": [{ "column": "name", "order": "asc" }]
  }
}

# Get record by ID
GET /api/db/get/:tableName/:id

# Update record
PUT /api/db/update/:tableName/:id
Content-Type: application/json

{
  "data": {
    "name": "John Smith"
  }
}

# Delete record
DELETE /api/db/del/:tableName/:id
```

### Permission Endpoints

```http
# Get table permissions
GET /api/db/permissions/:tableName

# Set table permissions
POST /api/db/permissions/:tableName
Content-Type: application/json

{
  "operations": {
    "SELECT": [
      { "allow": "public" }
    ],
    "INSERT": [
      { "allow": "auth" }
    ],
    "UPDATE": [
      {
        "allow": "auth",
        "fieldCheck": {
          "field": "id",
          "operator": "===",
          "valueType": "userContext",
          "value": "userId"
        }
      }
    ],
    "DELETE": [
      {
        "allow": "role",
        "roles": ["admin"]
      }
    ]
  }
}

# Delete table permissions
DELETE /api/db/permissions/:tableName
```

## Security Best Practices

1. **Enable Row-Level Security**:

   ```typescript
   // Enable RLS in configuration
   const webHandler = createIttyHandler({
     config: {
       enableSchemaEndpoints: true,
       enableDataEndpoints: true,
       enablePermissionEndpoints: true,
     },
     fgConfig: {
       prefix: '/api',
       services: {
         db: {
           provider: 'sqlite',
           config: {
             db: knexInstance,
             enforceRls: true, // Enable row-level security
           },
         },
       },
     },
   });
   ```

2. **Set Proper Permissions**:

   ```typescript
   // Set table-level permissions
   await db.setPermissions('users', {
     operations: {
       SELECT: [
         {
           allow: 'auth',
           fieldCheck: {
             field: 'id',
             operator: '===',
             valueType: 'userContext',
             value: 'userId',
           },
         },
       ],
       // Other operations...
     },
   });
   ```

3. **Use CORS Properly**:

   ```typescript
   // Configure CORS in Express
   app.use(
     cors({
       origin: ['http://localhost:5173'], // Specific origins
       credentials: true, // Allow credentials
       methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
     }),
   );
   ```

4. **Secure System Operations**:

   ```typescript
   // System operations bypass RLS
   const id = await db.insert(
     'users',
     {
       tableName: 'users',
       data: {
         name: 'Admin',
         email: 'admin@example.com',
         role: 'admin',
       },
     },
     { userId: 0, role: 'system' }, // System context
     true, // System operation flag
   );
   ```

## API Reference

### Configuration Types

```typescript
interface BaaSConfig {
  prefix: string;
  services: {
    db?: {
      provider: string;
      config: {
        db: any; // Knex instance
        enforceRls?: boolean;
        realtime?: boolean;
        websocketPort?: number;
        excludedTables?: string[];
        initializePermissions?: boolean;
      };
    };
    storage?: {
      provider: string;
      config: any;
    };
    [key: string]: any;
  };
}

// User context for row-level security
interface UserContext {
  userId: string | number;
  role?: string;
  teams?: string[];
  labels?: string[];
  [key: string]: any;
}
```

## Documentation

For more detailed documentation, please visit the [ForgeBase Documentation](https://docs.forgebase.dev/api):

- [Getting Started](https://docs.forgebase.dev/api/getting-started): Learn how to set up and use the API package
- [Framework Integration](https://docs.forgebase.dev/api/framework-integration): Integrate with your preferred framework
- [REST API Reference](https://docs.forgebase.dev/api/rest-api-reference): Explore the available REST API endpoints
- [Authentication](https://docs.forgebase.dev/api/authentication): Implement authentication with the API package
- [Database Operations](https://docs.forgebase.dev/api/database-operations): Perform database operations through the API
- [Schema Management](https://docs.forgebase.dev/api/schema-management): Manage your database schema

## License

MIT
