# ForgeBase Database

The ForgeBase Database library provides comprehensive database management and integration functionalities. It includes support for various database services and real-time updates.

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
  - [SQLite](#sqlite)
  - [PostgreSQL](#postgresql)
- [API Reference](#api-reference)
  - [ForgeDatabase](#forgedatabase)
  - [PermissionService](#permissionservice)
  - [DBInspector](#dbinspector)
- [Building](#building)
- [Running Tests](#running-tests)

## Features

- Database management
- Real-time updates
- Role-based access control
- Schema inspection and modification
- WebSocket support

## Installation

```bash
pnpm add @forgebase/database
```

## Basic Usage

```typescript
import { createForgeDatabase } from '@forgebase/database';
import Knex from 'knex';

const knexInstance = Knex({
  client: 'sqlite3',
  connection: {
    filename: './database.sqlite',
  },
});

const db = createForgeDatabase({
  db: knexInstance,
  realtime: true,
  websocketPort: 9001,
});
```

## Configuration

### SQLite

```typescript
const knexInstance = Knex({
  client: 'sqlite3',
  connection: {
    filename: './database.sqlite',
  },
});

const db = createForgeDatabase({
  db: knexInstance,
});
```

### PostgreSQL

```typescript
const knexInstance = Knex({
  client: 'pg',
  connection: {
    host: 'localhost',
    user: 'your-username',
    password: 'your-password',
    database: 'your-database',
  },
});

const db = createForgeDatabase({
  db: knexInstance,
});
```

## API Reference

### ForgeDatabase

The `ForgeDatabase` class provides methods for managing database schema, querying data, and handling permissions.

### PermissionService

The `PermissionService` class provides methods for setting and getting table permissions.

### DBInspector

The `DBInspector` class provides methods for inspecting the database schema.

## Building

Run `nx build database` to build the library.

## Running Tests

Run `nx test database` to execute the unit tests via [Jest](https://jestjs.io).

## License

This project is licensed under the MIT License.
