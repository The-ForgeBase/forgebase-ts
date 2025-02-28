# ForgeBase Common

The ForgeBase Common library provides a set of utilities, helpers, and shared code that can be used across different packages and applications within the ForgeBase ecosystem. It serves as the foundation for consistent functionality across all ForgeBase components.

## Purpose

This library aims to reduce code duplication and ensure consistency by providing reusable utilities and helper functions that are needed by multiple ForgeBase components. It includes common interfaces, type definitions, utility functions, and shared logic that simplifies development and maintenance of the ForgeBase ecosystem.

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
- [Utilities](#utilities)
  - [Adapter Factory](#adapter-factory)
- [Building](#building)
- [Running Tests](#running-tests)

## Installation

To install the ForgeBase Common library, run the following command:

```bash
pnpm add @forgebase/common
```

## Basic Usage

Here's an example of how to use the common utilities provided by the ForgeBase Common library:

```typescript
import { createAdapter } from '@forgebase/common';

const adapter = createAdapter({
  type: 'example',
  config: {
    // Adapter configuration
  },
});

adapter.doSomething();
```

## Utilities

### Adapter Factory

The Adapter Factory utility allows you to create different types of adapters based on the provided configuration. This can be useful for creating adapters for various services such as storage, database, and more.

```typescript
import { createAdapter } from '@forgebase/common';

const storageAdapter = createAdapter({
  type: 'storage',
  config: {
    provider: 'local',
    options: {
      // Storage provider options
    },
  },
});

const databaseAdapter = createAdapter({
  type: 'database',
  config: {
    provider: 'sqlite',
    options: {
      filename: './database.sqlite',
    },
  },
});
```

## Building

Run `nx build common` to build the library.

## Running Tests

Run `nx test common` to execute the unit tests via [Jest](https://jestjs.io).

## License

This project is licensed under the MIT License.
