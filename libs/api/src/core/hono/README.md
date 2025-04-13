# ForgeBase Hono Integration

This module provides first-class support for using ForgeBase API with [Hono](https://hono.dev/), a small, simple, and ultrafast web framework for the Edges.

## Installation

```bash
npm install @forgebase-ts/api hono
```

## Usage

### Basic Usage

```typescript
import { createHonoForgeApi } from '@forgebase-ts/api';
import { serve } from '@hono/node-server';

// Create a Hono app with ForgeBase API
const app = createHonoForgeApi({
  config: {
    prefix: '/api',
    services: {
      db: {
        provider: 'sqlite',
        realtime: true,
        enforceRls: true,
        config: {
          filename: './db.sqlite',
        },
      },
      storage: {
        provider: 'local',
        config: {},
      },
    },
  },
});

// Add your own routes
app.get('/', (c) => c.text('Hello ForgeBase!'));

// Start the server
serve({
  fetch: app.fetch,
  port: 3000,
});
```

### With Custom Hono App Instance

```typescript
import { createHonoForgeApi } from '@forgebase-ts/api';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';

// Create your own Hono app with custom middleware
const app = new Hono();

// Add your own middleware
app.use('*', logger());
app.use('*', cors());

// Add your own routes
app.get('/', (c) => c.text('Hello ForgeBase!'));

// Integrate ForgeBase API with your app
const apiApp = createHonoForgeApi({
  config: {
    prefix: '/api',
    services: {
      db: {
        provider: 'sqlite',
        realtime: true,
        enforceRls: true,
        config: {
          filename: './db.sqlite',
        },
      },
      storage: {
        provider: 'local',
        config: {},
      },
    },
  },
  app, // Pass your custom app instance
});

// Start the server
serve({
  fetch: apiApp.fetch,
  port: 3000,
});
```

### With Custom Database and Storage Services

```typescript
import { createHonoForgeApi, DatabaseService, StorageService } from '@forgebase-ts/api';
import { serve } from '@hono/node-server';
import knex from 'knex';

// Create a Knex instance
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './db.sqlite',
  },
  useNullAsDefault: true,
});

// Create custom services
const dbService = new DatabaseService({
  provider: 'sqlite',
  realtime: true,
  enforceRls: true,
  knex: db,
});

const storageService = new StorageService({
  provider: 'local',
  config: {},
});

// Create a Hono app with ForgeBase API
const app = createHonoForgeApi({
  config: {
    prefix: '/api',
  },
  db: dbService,
  storage: storageService,
});

// Start the server
serve({
  fetch: app.fetch,
  port: 3000,
});
```

### With Authentication

```typescript
import { createHonoForgeApi } from '@forgebase-ts/api';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { jwt } from 'hono/jwt';

// Create your own Hono app
const app = new Hono();

// Add JWT middleware
app.use('*', jwt({ secret: 'your-secret-key' }));

// Add authentication routes
app.post('/auth/login', async (c) => {
  const { username, password } = await c.req.json();

  // Authenticate user (replace with your own logic)
  if (username === 'admin' && password === 'password') {
    return c.json({
      token: 'your-jwt-token',
      user: {
        id: 1,
        username: 'admin',
        role: 'admin',
      },
    });
  }

  return c.json({ error: 'Invalid credentials' }, 401);
});

// Add user context middleware
app.use('/api/*', async (c, next) => {
  // Get user from JWT payload
  const user = c.get('jwtPayload');

  // Set user context for ForgeBase API
  c.set('userContext', {
    userId: user.id,
    role: user.role,
  });

  await next();
});

// Integrate ForgeBase API with your app
const apiApp = createHonoForgeApi({
  config: {
    prefix: '/api',
    services: {
      db: {
        provider: 'sqlite',
        realtime: true,
        enforceRls: true,
        config: {
          filename: './db.sqlite',
        },
      },
      storage: {
        provider: 'local',
        config: {},
      },
    },
  },
  app, // Pass your custom app instance
});

// Start the server
serve({
  fetch: apiApp.fetch,
  port: 3000,
});
```

## API Reference

### `createHonoForgeApi(options)`

Creates a Hono app with ForgeBase API integration.

#### Options

- `config`: The ForgeBase configuration object.
- `db`: A custom DatabaseService instance.
- `storage`: A custom StorageService instance.
- `app`: A custom Hono app instance. If provided, the ForgeBase API routes will be mounted on this app.

#### Returns

A Hono app with ForgeBase API routes.

## Routes

The ForgeBase API provides the following routes:

### Schema Routes

- `GET /db/schema`: Get the database schema.
- `GET /db/schema/tables`: Get all tables.
- `GET /db/schema/tables/:tableName`: Get a table schema.
- `GET /db/schema/tables/permission/:tableName`: Get a table schema with permissions.
- `POST /db/schema`: Create a new table.
- `DELETE /db/schema/tables/:tableName`: Delete a table.
- `POST /db/schema/column`: Add a column to a table.
- `DELETE /db/schema/column`: Delete a column from a table.
- `PUT /db/schema/column`: Update a column in a table.
- `POST /db/schema/foreign_key`: Add a foreign key to a table.
- `DELETE /db/schema/foreign_key`: Delete a foreign key from a table.
- `DELETE /db/schema/truncate`: Truncate a table.
- `GET /db/schema/permissions/:tableName`: Get permissions for a table.
- `POST /db/schema/permissions/:tableName`: Set permissions for a table.

### Data Routes

- `GET /db/:collection`: Query items from a collection.
- `GET /db/:collection/:id`: Get an item by ID.
- `POST /db/:collection`: Create a new item.
- `PUT /db/:collection/:id`: Update an item.
- `DELETE /db/:collection/:id`: Delete an item.

## License

MIT
