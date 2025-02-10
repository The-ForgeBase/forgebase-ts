# ForgeBase Storage

The ForgeBase Storage library provides comprehensive storage management and integration functionalities. It includes support for various storage services and real-time updates.

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
  - [Local Storage](#local-storage)
  - [Cloud Storage](#cloud-storage)
- [API Reference](#api-reference)
  - [StorageService](#storageservice)
- [Building](#building)
- [Running Tests](#running-tests)

## Features

- Storage management
- Real-time updates
- Role-based access control
- WebSocket support

## Installation

```bash
pnpm add @forgebase/storage
```

## Basic Usage

```typescript
import { createStorageService } from '@forgebase/storage';

const storageService = createStorageService({
  provider: 'local',
  config: {
    // Local storage configuration
  },
});

await storageService.upload('bucket-name', 'file-key', Buffer.from('file-data'));
const fileData = await storageService.download('bucket-name', 'file-key');
```

## Configuration

### Local Storage

```typescript
const storageService = createStorageService({
  provider: 'local',
  config: {
    // Local storage configuration
  },
});
```

### Cloud Storage

```typescript
const storageService = createStorageService({
  provider: 'cloud',
  config: {
    apiKey: 'your-api-key',
    bucket: 'your-bucket-name',
  },
});
```

## API Reference

### StorageService

The `StorageService` class provides methods for uploading and downloading files.

## Building

Run `nx build storage` to build the library.

## Running Tests

Run `nx test storage` to execute the unit tests via [Jest](https://jestjs.io).

## License

This project is licensed under the MIT License.
