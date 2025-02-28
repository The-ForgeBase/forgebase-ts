# ForgeBase Studio UI Utils

The ForgeBase Studio UI Utils library provides utility functions and helper tools specifically designed to support the ForgeBase Studio UI components. It contains reusable logic that enhances the functionality of UI components without cluttering their implementation.

## Purpose

This library serves as a companion to the ForgeBase Studio UI library, offering utilities that simplify common UI tasks such as styling, formatting, validation, and state management. By separating these utilities from the UI components themselves, we maintain cleaner component code while ensuring consistent behavior across the ForgeBase Studio application.

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
