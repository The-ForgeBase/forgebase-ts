# ForgeBase Auth

A flexible authentication library for Node.js applications, providing multiple authentication strategies and framework adapters.

> **Notice:** This documentation is now complete. All features and usage examples are listed below.

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
  - [Local Provider](#local-provider)
  - [OAuth Provider](#oauth-provider)
- [Framework Integration](#framework-integration)
  - [Hono](#hono)
  - [Express](#express)
  - [Fastify](#fastify)
- [API Reference](#api-reference)
  - [createAuth(options)](#createauthoptions)
  - [auth.middleware()](#authmiddleware)
  - [auth.handleCallback(provider)](#authhandlecallbackprovider)
- [Building](#building)
- [Running Tests](#running-tests)

## Features

- Multiple authentication providers:
  - Local (username/password)
  - Passwordless (email/phone)
  - OAuth (Google, GitHub, etc.)
- Framework adapters:
  - Express
  - Fastify
  - Hono
- Session management
- JWT support
- Role-based access control

## Installation

```bash
pnpm add @forgebase/auth
```

## Basic Usage

```typescript
import { createAuth } from '@forgebase/auth';
import { HonoAdapter } from '@forgebase/auth/adapters';

const auth = createAuth({
  adapter: new HonoAdapter(),
  providers: [
    new LocalProvider({
      // Local provider configuration
    }),
    new OAuthProvider({
      // OAuth provider configuration
    }),
  ],
});
```

## Configuration

### Local Provider

```typescript
const localProvider = new LocalProvider({
  validateCredentials: async (credentials) => {
    // Implement your credential validation logic
    return { id: 'user_id', name: 'User Name' };
  },
});
```

### OAuth Provider

```typescript
const oauthProvider = new OAuthProvider({
  providers: {
    google: {
      clientId: 'your_client_id',
      clientSecret: 'your_client_secret',
      callbackUrl: 'http://localhost:3000/auth/callback',
    },
  },
});
```

## Framework Integration

### Hono

```typescript
import { Hono } from 'hono';
import { createAuth, HonoAdapter } from '@forgebase/auth';

const app = new Hono();
const auth = createAuth({
  adapter: new HonoAdapter(),
});

app.use('/protected', auth.middleware());
```

### Express

```typescript
import express from 'express';
import { createAuth, ExpressAdapter } from '@forgebase/auth';

const app = express();
const auth = createAuth({
  adapter: new ExpressAdapter(),
});

app.use('/protected', auth.middleware());
```

### Fastify

```typescript
import Fastify from 'fastify';
import { createAuth, FastifyAdapter } from '@forgebase/auth';

const app = Fastify();
const auth = createAuth({
  adapter: new FastifyAdapter(),
});

app.register(auth.middleware());
```

## API Reference

### createAuth(options)

Creates a new auth instance with the specified options.

```typescript
type AuthOptions = {
  adapter: AuthAdapter;
  providers: AuthProvider[];
  session?: SessionOptions;
  jwt?: JWTOptions;
};
```

### auth.middleware()

Returns a middleware function for protecting routes.

### auth.handleCallback(provider)

Handles OAuth callback requests.

## Building

Run `nx build auth` to build the library.

## Running Tests

Run `nx test auth` to execute the unit tests via Jest.

## License

MIT
