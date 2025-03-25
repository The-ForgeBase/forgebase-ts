# ForgeBase API

A flexible, framework-agnostic API library for building robust backend services with built-in database and storage capabilities. This library provides a unified interface for handling HTTP requests, database operations, and file storage across various Node.js frameworks.

## Purpose

This library enables developers to easily integrate ForgeBase backend services into their applications by providing a clean, consistent API surface. It abstracts away the complexity of direct service interactions and provides a unified interface for working with authentication, database operations, storage management, and real-time features.

## Core Features

- **Framework Integration**:

  - Express.js adapter with middleware support
  - NestJS modules (ForgeApiModule and ForgeApiWithChildModule)
  - Fastify adapter with plugin system
  - Hono adapter for edge compatibility
  - Framework-agnostic core for custom integrations

- **Database Operations**:

  - CRUD operations with type safety
  - Schema management and migrations
  - Query builder with filtering and pagination
  - Real-time updates (optional)
  - Row-level security (RLS)
  - Permissions management

- **Request Handling**:

  - Unified request/response interface
  - Route parameter parsing
  - Query string handling
  - Body parsing with validation
  - Header management
  - Cookie support

- **Middleware System**:

  - Request/response pipeline
  - Authentication middleware
  - Admin request handling
  - Custom middleware support
  - Error handling middleware

- **Security Features**:

  - Role-based access control (RBAC)
  - Input validation and sanitization
  - CORS configuration
  - Rate limiting
  - API key authentication
  - Admin request validation

- **Storage Integration**:

  - Local file system storage
  - Cloud storage providers
  - File upload/download
  - Stream support
  - Bucket management
  - Access control

- **Configuration Management**:
  - Environment-based config
  - Service configuration
  - Dynamic updates
  - Validation
  - Defaults handling

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
  - [Core API Setup](#core-api-setup)
- [Framework Integration](#framework-integration)
  - [NestJS Integration](#nestjs-integration)
  - [Express Integration](#express-integration)
  - [Fastify Integration](#fastify-integration)
  - [Hono Integration](#hono-integration)
- [Database Operations](#database-operations)
- [Schema Management](#schema-management)
- [Admin Operations](#admin-operations)
- [Error Handling](#error-handling)
- [Security Best Practices](#security-best-practices)
- [API Reference](#api-reference)
  - [ForgeApi Class](#forgeapi-class)
  - [ServerAdapter Interface](#serveradapter-interface)
  - [Configuration Types](#configuration-types)
- [Testing](#testing)
- [License](#license)

## Installation

```bash
npm install @forgebase-ts/api
# or
yarn add @forgebase-ts/api
# or
pnpm add @forgebase-ts/api
```

## Basic Usage

### Core API Setup

```typescript
import { forgeApi } from '@forgebase-ts/api';

const api = forgeApi({
  prefix: '/api',
  services: {
    db: {
      provider: 'sqlite',
      config: {
        filename: 'database.sqlite',
      },
      enforceRls: true,
      realtime: false,
    },
    storage: {
      provider: 'local',
      config: {},
    },
  },
});

// Add custom routes
api.get('/custom', async (ctx) => {
  ctx.res.body = { message: 'Hello World' };
});

// Add middleware
api.use(async (ctx, next) => {
  console.log(`${ctx.req.method} ${ctx.req.path}`);
  await next();
});
```

## Framework Integration

### NestJS Integration

ForgeBase API provides three different NestJS module options depending on your needs:

#### Option 1: Basic Module (ForgeApiModule)

```typescript
import { Module } from '@nestjs/common';
import { ForgeApiModule } from '@forgebase-ts/api/core/nest';

@Module({
  imports: [
    ForgeApiModule.forRoot({
      prefix: '/api',
      services: {
        db: {
          provider: 'sqlite',
          config: { filename: 'database.sqlite' },
          enforceRls: false,
          realtime: false,
        },
        storage: {
          provider: 'local',
          config: {},
        },
      },
    }),
  ],
})
export class AppModule {}
```

#### Option 2: Child Module Support (ForgeApiWithChildModule)

```typescript
import { Module } from '@nestjs/common';
import { ForgeApiWithChildModule } from '@forgebase-ts/api/core/nest';

// Root module with global configuration
@Module({
  imports: [
    ForgeApiWithChildModule.forRoot({
      prefix: '/api',
      services: {
        db: {
          provider: 'sqlite',
          config: { filename: 'database.sqlite' },
        },
        storage: {
          provider: 'local',
          config: {},
        },
      },
    }),
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
          config: { filename: 'feature-database.sqlite' },
        },
      },
    }),
  ],
})
export class FeatureModule {}
```

You can also use custom routes and guards with NestJS:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ForgeApiService } from '@forgebase-ts/api/core/nest';
import { ApiAdmin, ApiPublic } from '@forgebase-ts/api/core/nest';

@Controller('custom')
export class CustomController {
  constructor(private readonly forgeApiService: ForgeApiService) {}

  @Get('public')
  @ApiPublic() // Public endpoint, no auth required
  getPublicData() {
    return { message: 'Public data' };
  }

  @Get('admin')
  @ApiAdmin() // Admin-only endpoint
  getAdminData() {
    return { message: 'Admin data' };
  }
}
```

### Express Integration

```typescript
import express from 'express';
import { forgeExpressMiddleware } from '@forgebase-ts/api/frameworks/express';

const app = express();

// Apply the ForgeBase middleware
app.use(
  forgeExpressMiddleware({
    prefix: '/api',
    services: {
      db: {
        provider: 'sqlite',
        config: { filename: 'database.sqlite' },
      },
      storage: {
        provider: 'local',
        config: {},
      },
    },
  })
);

// Your custom routes
app.get('/custom', (req, res) => {
  res.json({ message: 'Custom route' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Fastify Integration

```typescript
import Fastify from 'fastify';
import { FastifyAdapter } from '@forgebase-ts/api/adapters';

const app = Fastify();
const adapter = new FastifyAdapter(app);

// Setup routes with cookie support
adapter.setupRoutes(app, true);
```

### Hono Integration

```typescript
import { Hono } from 'hono';
import { honoUserMiddleware } from '@forgebase-ts/api/frameworks/hono';
import { HonoAdapter } from '@forgebase-ts/api/adapters';
import { forgeApi } from '@forgebase-ts/api';

const app = new Hono();
const api = forgeApi({
  prefix: '/api',
  services: {
    db: {
      provider: 'sqlite',
      config: { filename: 'database.sqlite' },
    },
    storage: {
      provider: 'local',
      config: {},
    },
  },
});

// Add user context middleware if using auth
app.use('*', async (c, next) => {
  const session = c.get('session');
  await honoUserMiddleware(session, c, next);
});

// Apply ForgeBase API to specific routes
app.use('/api/*', async (c, next) => {
  try {
    const adapter = new HonoAdapter(c);
    const result = await api.handle(adapter);

    if (result) {
      const { context } = result;
      return c.json(context.res.body, context.res.status);
    }
    return next();
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});
```

## Database Operations

```typescript
// Create a new record
const id = await api.getDatabaseService().insert(
  'users',
  {
    tableName: 'users',
    data: {
      name: 'John Doe',
      email: 'john@example.com',
    },
  },
  userContext
);

// Query records
const users = await api.getDatabaseService().query(
  'users',
  {
    filter: { role: 'admin' },
    select: ['id', 'name', 'email'],
    limit: 10,
    offset: 0,
  },
  userContext
);

// Update a record
await api.getDatabaseService().update(
  {
    tableName: 'users',
    data: { role: 'manager' },
    id: 1,
  },
  userContext
);

// Delete a record
await api.getDatabaseService().delete('users', 1, userContext);
```

## Schema Management

```typescript
// Create table schema
await api.getDatabaseService().createSchema('posts', [
  {
    name: 'id',
    type: 'increments',
    primaryKey: true,
  },
  {
    name: 'title',
    type: 'string',
    nullable: false,
  },
  {
    name: 'content',
    type: 'text',
  },
  {
    name: 'author_id',
    type: 'integer',
    references: 'users.id',
  },
]);

// Add column
await api.getDatabaseService().addColumn('posts', [
  {
    name: 'published_at',
    type: 'timestamp',
  },
]);

// Set permissions
await api.getDatabaseService().setPermissions('posts', {
  read: {
    roles: ['user', 'admin'],
    rule: 'author_id = :user_id',
  },
  write: {
    roles: ['admin'],
  },
});
```

## Admin Operations

```typescript
// System-level request handling
const adminSecret = process.env.FORGE_ADMIN_SECRET;
const isSystem = req.headers['x-forge-admin'] === adminSecret;

// Admin-only schema operations
if (isSystem) {
  const schema = await api.getDatabaseService().getSchema();
  const tables = await api.getDatabaseService().getTables();
  const tableSchema = await api.getDatabaseService().getTableSchema('users');
}
```

## Error Handling

```typescript
try {
  await api.handle(adapter);
} catch (error) {
  if (error instanceof DatabaseError) {
    // Handle database errors
  } else if (error instanceof ValidationError) {
    // Handle validation errors
  } else if (error instanceof AuthorizationError) {
    // Handle authorization errors
  }
}
```

## Security Best Practices

1. **Input Validation**:

   ```typescript
   // Validate data before insertion
   const validateUser = (data: any) => {
     if (!data.email || !data.email.includes('@')) {
       throw new ValidationError('Invalid email');
     }
     // More validation rules
   };
   ```

2. **Row-Level Security**:

   ```typescript
   // Enable RLS in configuration
   const config = {
     services: {
       db: {
         enforceRls: true,
         // ...
       },
     },
   };

   // Set table-level permissions
   await api.getDatabaseService().setPermissions('documents', {
     read: {
       roles: ['user'],
       rule: 'owner_id = :user_id OR is_public = true',
     },
   });
   ```

3. **Admin Request Validation**:

   ```typescript
   // Secure admin endpoints
   const adminHeaderName = config.api?.adminReqName || 'x-forge-admin';
   const adminSecret = process.env.FORGE_ADMIN_SECRET;

   if (!adminSecret) {
     console.warn('FORGE_ADMIN_SECRET not set. System-level requests disabled.');
   }
   ```

## API Reference

### ForgeApi Class

```typescript
class ForgeApi {
  constructor(config: Partial<BaaSConfig>);

  // Core methods
  handle(adapter: ServerAdapter, isSystem?: boolean): Promise<HandlerResult>;
  use(middleware: Handler): this;

  // Route methods
  get(path: string, handler: Handler): this;
  post(path: string, handler: Handler): this;
  put(path: string, handler: Handler): this;
  delete(path: string, handler: Handler): this;

  // Service access
  getStorageService(): StorageService;
  getDatabaseService(): DatabaseService;
  getConfig(): BaaSConfig;
}
```

### ServerAdapter Interface

```typescript
interface ServerAdapter {
  getMethod(): string;
  getPath(): string;
  getHeaders(): Record<string, any>;
  getQuery(): Record<string, any>;
  getBody(): Promise<any>;
  getUserContext(): UserContext;
}
```

### Configuration Types

```typescript
interface BaaSConfig {
  prefix: string;
  auth?: {
    enabled: boolean;
    exclude?: string[];
    beforeMiddleware?: boolean;
  };
  api?: {
    adminReqName?: string;
  };
  services: {
    storage: StorageConfig;
    db: DatabaseConfig;
  };
}
```

## Testing

```bash
# Run unit tests
nx test api

# Run integration tests
nx test api --config=integration
```

## License

MIT
