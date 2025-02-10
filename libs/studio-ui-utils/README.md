# ForgeBase Studio UI Utils

The ForgeBase Studio UI Utils library provides a set of utilities and shared code that can be used across different packages and applications within the ForgeBase project.

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
- [Utilities](#utilities)
  - [Class Name Utility](#class-name-utility)
- [Building](#building)
- [Running Tests](#running-tests)

## Installation

To install the ForgeBase Studio UI Utils library, run the following command:

```bash
pnpm add @forgebase/studio-ui-utils
```

## Basic Usage

Here's an example of how to use the utilities provided by the ForgeBase Studio UI Utils library:

```typescript
import { cn } from '@forgebase/studio-ui-utils';

const className = cn('class1', 'class2', { 'class3': true });
```

## Utilities

### Class Name Utility

The Class Name Utility allows you to conditionally join class names together. This can be useful for dynamically applying classes based on certain conditions.

```typescript
import { cn } from '@forgebase/studio-ui-utils';

const className = cn('class1', 'class2', { 'class3': true });
```

## Building

Run `nx build studio-ui-utils` to build the library.

## Running Tests

Run `nx test studio-ui-utils` to execute the unit tests via [Jest](https://jestjs.io).

## License

This project is licensed under the MIT License.
