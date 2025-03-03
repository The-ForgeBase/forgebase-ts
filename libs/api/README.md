# ForgeBase API

The ForgeBase API library provides a comprehensive set of functionalities and integrations for building and managing APIs within the ForgeBase ecosystem. It serves as the core interface layer between your application and ForgeBase services.

## Purpose

This library enables developers to easily integrate ForgeBase backend services into their applications by providing a clean, consistent API surface. It abstracts away the complexity of direct service interactions and provides a unified interface for working with authentication, database operations, storage management, and real-time features.

## Core Features

- **Framework Agnostic**: Works with Express, Fastify, Hono, NestJS, and more
- **Database Integration**: Support for SQLite, PostgreSQL, and LibSQL with Knex
- **Storage Integration**: File storage with support for local, S3, GCP, and Cloudinary backends
- **Authentication & Authorization**: Fine-grained role, table, and namespace-level permissions
- **Middleware Support**: Custom middleware for request/response processing
- **Custom Routing**: Build custom API endpoints with a simple router interface
- **Admin API**: Built-in API endpoints for database schema and data management
- **TypeScript Support**: Full type safety with TypeScript interfaces

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
  - [Standalone Usage](#standalone-usage)
  - [Framework-Specific Integration](#framework-specific-integration)
- [Configuration](#configuration)
  - [Database Configuration](#database-configuration)
  - [Storage Configuration](#storage-configuration)
  - [Authentication Configuration](#authentication-configuration)
- [Framework Integration](#framework-integration)
  - [NestJS Integration](#nestjs-integration)
  - [Express Integration](#express-integration)
  - [Fastify Integration](#fastify-integration)
  - [Hono Integration](#hono-integration)
- [Core Services](#core-services)
  - [Database Service](#database-service)
  - [Storage Service](#storage-service)
  - [Auth Service](#auth-service)
- [API Reference](#api-reference)
  - [ForgeApi](#forgeapi)
  - [Route Handlers](#route-handlers)
  - [Middleware](#middleware)
- [Building](#building)
- [Running Tests](#running-tests)

## Installation

```bash
npm install @forgebase-ts/api
# or
yarn add @forgebase-ts/api
# or
pnpm add @forgebase-ts/api
```

## Basic Usage

### Standalone Usage

```typescript
import { forgeApi } from '@forgebase-ts/api';

const api = forgeApi({
  prefix: '/api',
  auth: {
    enabled: true,
    exclude: ['/auth/login', '/auth/register'],
  },
  services: {
    storage: {
      provider: 'local',
      config: {},
    },
    db: {
      provider: 'sqlite',
      config: {
        filename: './database.sqlite',
      },
      realtime: false,
      enforceRls: true,
    },
  },
});

// Add custom routes
api.get('/hello', async (ctx) => {
  ctx.res.body = { message: 'Hello World' };
});

api.post('/items', async (ctx) => {
  const id = await ctx.services.db.insert('items', ctx.req.body, ctx.req.userContext);
  ctx.res.status = 201;
  ctx.res.body = { id };
});
```

### Framework-Specific Integration

ForgeAPI can be integrated into various frameworks using dedicated adapters:

```typescript
import { forgeApi } from '@forgebase-ts/api';
import { ExpressAdapter } from '@forgebase-ts/api/adapters';
import express from 'express';

const app = express();
const api = forgeApi({
  prefix: '/api',
  services: {
    db: {
      provider: 'sqlite',
      config: { filename: './database.sqlite' },
      realtime: false,
      enforceRls: false,
    },
    storage: {
      provider: 'local',
      config: {},
    },
  },
});

// Use the adapter for each request
app.use(async (req, res, next) => {
  try {
    const adapter = new ExpressAdapter(req);
    const result = await api.handle(adapter);

    if (result) {
      const { context } = result;
      res.status(context.res.status).json(context.res.body);
    } else {
      next();
    }
  } catch (error) {
    next(error);
  }
});
```

## Configuration

### Database Configuration

```typescript
const api = forgeApi({
  services: {
    db: {
      // Database provider: 'sqlite', 'postgres', or 'libsql'
      provider: 'postgres',

      // Database-specific configuration
      config: {
        connection: {
          host: 'localhost',
          port: 5432,
          user: 'postgres',
          password: 'password',
          database: 'forge',
        },
      },

      // Enable real-time updates
      realtime: true,

      // Enable row-level security
      enforceRls: true,

      // Pass an existing Knex instance
      knex: existingKnexInstance,
    },
  },
});
```

### Storage Configuration

```typescript
const api = forgeApi({
  services: {
    storage: {
      // Storage provider: 'local', 's3', 'gcp', or 'cloudinary'
      provider: 's3',

      // Provider-specific configuration
      config: {
        bucket: 'my-bucket',
        region: 'us-east-1',
        accessKeyId: 'AKIAXXXXXXXX',
        secretAccessKey: 'XXXXXXXXXX',
      },
    },
  },
});
```

### Authentication Configuration

```typescript
const api = forgeApi({
  auth: {
    // Enable authentication
    enabled: true,

    // Routes that don't require authentication
    exclude: ['/auth/login', '/auth/register', '/public'],

    // Run auth check before middleware (true) or after middleware (false)
    beforeMiddleware: true,
  },
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

#### Option 3: Middleware Integration (ForgeNestApiModule)

```typescript
import { Module } from '@nestjs/common';
import { ForgeNestApiModule } from '@forgebase-ts/api/frameworks/nest';

@Module({
  imports: [
    ForgeNestApiModule.forRoot({
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

## Core Services

### Database Service

The database service provides access to the underlying database:

```typescript
const dbService = api.getDatabaseService();

// Query records
const users = await dbService.query(
  'users',
  {
    filter: { role: 'admin' },
    select: ['id', 'name', 'email'],
    orderBy: { field: 'created_at', direction: 'desc' },
    limit: 10,
  },
  userContext
);

// Insert a record
const id = await dbService.insert(
  'posts',
  {
    tableName: 'posts',
    data: { title: 'Hello World', content: 'First post', author_id: 1 },
  },
  userContext
);

// Update a record
await dbService.update(
  {
    tableName: 'posts',
    data: { title: 'Updated Title' },
    id: 1,
  },
  userContext
);

// Delete a record
await dbService.delete('posts', 1, userContext);

// Schema management
const schema = await dbService.getSchema();
const tables = await dbService.getTables();

// Create a new table
await dbService.createSchema('comments', [
  {
    name: 'id',
    type: 'increments',
    primaryKey: true,
  },
  {
    name: 'post_id',
    type: 'integer',
    nullable: false,
  },
  {
    name: 'content',
    type: 'text',
    nullable: false,
  },
]);
```

### Storage Service

The storage service provides file storage capabilities:

```typescript
const storageService = api.getStorageService();

// Upload a file
await storageService.upload('public', 'image.jpg', fileData);

// Download a file
const fileBuffer = await storageService.download('public', 'image.jpg');

// Check if a file exists
const exists = await storageService.exists('public', 'image.jpg');

// Get file metadata
const metadata = await storageService.getMetadata('public', 'image.jpg');

// Delete a file
await storageService.delete('public', 'image.jpg');
```

### Auth Service

The auth service provides authentication and authorization capabilities:

```typescript
import { AuthService } from '@forgebase-ts/api';

const authService = new AuthService({
  enabled: true,
});

// Validate a token
const isValid = await authService.validateToken('token');

// Create a user
const userId = await authService.createUser('user@example.com', 'password');
```

## API Reference

### ForgeApi

The `ForgeApi` class is the main entry point for the library:

```typescript
class ForgeApi {
  // Constructor
  constructor(config?: Partial<BaaSConfig>);

  // Service access
  getStorageService(): StorageService;
  getDatabaseService(): DatabaseService;
  getConfig(): BaaSConfig;

  // Request handling
  handle(adapter: ServerAdapter): Promise<{ adapter: ServerAdapter; context: Context }>;

  // Middleware
  use(middleware: Handler): this;

  // Route methods
  get(path: string, handler: Handler): this;
  post(path: string, handler: Handler): this;
  put(path: string, handler: Handler): this;
  delete(path: string, handler: Handler): this;
}
```

### Route Handlers

Route handlers are async functions that receive and modify a context object:

```typescript
type Handler = (ctx: Context) => Promise<void>;

type Context = {
  req: {
    params: Record<string, any>;
    query: Record<string, any>;
    body: any;
    headers: Record<string, string>;
    method: string;
    path: string;
    config: BaaSConfig;
    userContext: UserContext;
  };
  res: {
    body: any;
    status: number;
    headers: Record<string, any>;
  };
  services: {
    storage: StorageService;
    db: DatabaseService;
  };
};
```

### Middleware

Middleware functions have the same signature as route handlers:

```typescript
// Authentication middleware example
const authMiddleware: Handler = async (ctx) => {
  const token = ctx.req.headers.authorization?.split(' ')[1];
  if (!token) {
    ctx.res.status = 401;
    ctx.res.body = { error: 'Unauthorized' };
    return;
  }

  // Authenticate the token
  try {
    const user = await validateToken(token);
    ctx.req.userContext = user;
  } catch (error) {
    ctx.res.status = 401;
    ctx.res.body = { error: 'Invalid token' };
  }
};

// Apply the middleware
api.use(authMiddleware);
```

## Building

Run `nx build api` to build the library.

## Running Tests

Run `nx test api` to execute the unit tests via [Jest](https://jestjs.io).

## License

This project is licensed under the MIT License.
