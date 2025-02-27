# ForgeBase API

The ForgeBase API library provides a comprehensive set of functionalities and integrations for building and managing APIs. It includes support for various services such as storage, database, and authentication.

## Purpose of the Project

The BaaS Framework is an open-source Backend as a Service (BaaS) framework designed to provide backend functionality for a variety of backend frameworks across multiple languages, including but not limited to:

- Go
- TypeScript
- Rust
- PHP
- Deno
- Node.js
- and more!

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
pnpm add @forgebase/api
```

## Basic Usage

### Standalone Usage

```typescript
import { forgeApi } from '@forgebase/api';

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

```typescript
import { Module } from '@nestjs/common';
import { ForgeNestApiModule } from '@forgebase/api';

@Module({
  imports: [
    ForgeNestApiModule.forRoot({
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
    }),
  ],
})
export class AppModule {}

// Feature module with custom route configuration
@Module({
  imports: [
    ForgeNestApiModule.forChild({
      prefix: '/custom-api',
      routes: ['/custom-api/*'],
    }),
  ],
})
export class CustomModule {}
```

## Configuration

### Storage Service

```typescript
const storageService = api.getStorageService();

await storageService.upload('bucket-name', 'file-key', Buffer.from('file-data'));
const fileData = await storageService.download('bucket-name', 'file-key');
```

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
import { AuthService } from '@forgebase/api';

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
