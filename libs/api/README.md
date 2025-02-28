# ForgeBase API

The ForgeBase API library provides a comprehensive set of functionalities and integrations for building and managing APIs within the ForgeBase ecosystem. It serves as the core interface layer between your application and ForgeBase services.

## Purpose

This library enables developers to easily integrate ForgeBase backend services into their applications by providing a clean, consistent API surface. It abstracts away the complexity of direct service interactions and provides a unified interface for working with authentication, database operations, storage management, and real-time features.

## Core Features

- Authentication & Authorization: Fine-grained role, table, and namespace-level permissions.
- Database Integration: Compatibility with modern real-time databases like RethinkDB, SurrealDB, etc.
- Object Storage: Built-in support for object storage solutions.
- Extendability: Easy to add custom routes and extend functionality beyond the BaaS features.
- Real-time Features: Full real-time support for db, presence, etc.

## Why This Framework?

Our mission is to simplify backend development by providing a highly flexible, language-agnostic BaaS framework that developers can plug into their existing server setup. While we are 70% inspired by Pocketbase, we recognized its limitations—particularly its dependency on SQLite and its inability to scale horizontally. To overcome these challenges, we are building a better alternative that not only supports horizontal scaling but also integrates with more robust databases like PostgreSQL, SurrealDB, etc. This approach ensures that our framework is scalable, versatile, and suitable for a wide range of applications, from small projects to large, distributed systems.

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Configuration](#configuration)
  - [Storage Service](#storage-service)
  - [Database Service](#database-service)
  - [Authentication Service](#authentication-service)
- [API Reference](#api-reference)
  - [ForgeApi](#forgeapi)
  - [StorageService](#storageservice)
  - [DatabaseService](#databaseservice)
  - [AuthService](#authservice)
- [Building](#building)
- [Running Tests](#running-tests)

## Features

- Storage management
- Database management
- Authentication and authorization
- Middleware support
- Custom route handling

## Installation

```bash
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
    },
  },
});
```

### NestJS Integration

ForgeBase API provides three main integration modules for NestJS:

#### Option 1: Using ForgeApiModule

This is the simplest integration method, suitable for applications that need a single global configuration.

```typescript
import { Module } from '@nestjs/common';
import { ForgeApiModule } from '@forgebase-ts/api';

@Module({
  imports: [
    ForgeApiModule.forRoot({
      prefix: 'api',
      services: {
        db: {
          provider: 'sqlite',
          config: {
            filename: 'database.sqlite',
          },
          enforceRls: false,
          realtime: false,
        },
        storage: {
          provider: 'local',
          config: {},
        },
      },
    }),
    // Your other modules...
  ],
})
export class AppModule {}
```

#### Option 2: Using ForgeApiWithChildModule

This option provides more flexibility by allowing different parts of your application to use different configurations.

```typescript
import { Module } from '@nestjs/common';
import { ForgeApiWithChildModule } from '@forgebase-ts/api';

// Main AppModule with global configuration
@Module({
  imports: [
    ForgeApiWithChildModule.forRoot({
      prefix: 'api',
      services: {
        db: {
          provider: 'sqlite',
          config: {
            filename: 'database.sqlite',
          },
          enforceRls: false,
          realtime: false,
        },
        storage: {
          provider: 'local',
          config: {},
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
      prefix: 'feature-api',
      services: {
        db: {
          provider: 'sqlite',
          config: {
            filename: 'database.sqlite',
          },
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
export class FeatureModule {}
```

#### Option 3: Using ForgeNestApiModule

This is the recommended module for NestJS applications, providing direct integration with NestJS middleware system.

```typescript
import { Module } from '@nestjs/common';
import { ForgeNestApiModule } from '@forgebase-ts/api';
import knex from 'knex';

// Create a database connection
export const db = knex({
  client: 'sqlite3',
  connection: {
    filename: ':memory:',
  },
  useNullAsDefault: true,
});

@Module({
  imports: [
    ForgeNestApiModule.forRoot({
      prefix: '/api',
      services: {
        db: {
          provider: 'sqlite',
          realtime: false,
          enforceRls: false,
          config: {
            filename: './database.sqlite',
          },
          knex: db, // Pass an existing knex instance
        },
        storage: {
          provider: 'local',
          config: {},
        },
      },
    }),
    // Your other modules...
  ],
})
export class AppModule {}
```

````

## Configuration

### Storage Service

```typescript
const storageService = api.getStorageService();

await storageService.upload('bucket-name', 'file-key', Buffer.from('file-data'));
const fileData = await storageService.download('bucket-name', 'file-key');
````

### Database Service

```typescript
const dbService = api.getDatabaseService();

await dbService.insert('table-name', { column1: 'value1', column2: 'value2' });
const records = await dbService.query('table-name', { filter: { column1: 'value1' } });
await dbService.update({ tableName: 'table-name', data: { column2: 'new-value' }, id: 1 });
await dbService.delete('table-name', 1);
```

### Authentication Service

```typescript
import { AuthService } from '@forgebase-ts/api';

const authService = new AuthService({
  enabled: true,
});

const isValidToken = await authService.validateToken('token');
const userId = await authService.createUser('email@example.com', 'password');
```

## API Reference

### ForgeApi

The `ForgeApi` class provides methods for managing routes, handling requests, and accessing services.

### StorageService

The `StorageService` class provides methods for uploading and downloading files.

### DatabaseService

The `DatabaseService` class provides methods for querying, inserting, updating, and deleting records in the database.

### AuthService

The `AuthService` class provides methods for validating tokens and creating users.

## Building

Run `nx build api` to build the library.

## Running Tests

Run `nx test api` to execute the unit tests via [Jest](https://jestjs.io).

## License

This project is licensed under the MIT License.
