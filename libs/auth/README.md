# ForgeBase Auth

A flexible authentication library for Node.js applications, providing multiple authentication strategies and framework adapters.

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
