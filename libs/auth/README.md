# ForgeBase Auth

A flexible authentication library for Node.js applications, providing multiple authentication strategies and framework adapters. This library is a core component of the ForgeBase ecosystem, enabling secure user authentication across various platforms and frameworks.

## Purpose

The ForgeBase Auth library simplifies the implementation of authentication in your applications by providing a unified interface for various authentication methods. It supports local authentication, OAuth providers, passwordless authentication, and custom authentication strategies, making it easy to secure your applications regardless of the underlying framework.

## Core Features

- **Multiple Authentication Methods**: Support for local login, OAuth providers, passwordless login, and MFA
- **Framework Adapters**: Ready-to-use integrations with Express.js, Fastify, NestJS, and Hono
- **Admin Management**: Built-in support for admin user management with audit logging
- **Database Integration**: Knex-based user storage with flexible schema configuration
- **Session Management**: Both basic session and JWT-based token management
- **MFA Support**: TOTP, SMS, and email verification options for multi-factor authentication
- **Extensible Plugin System**: Add custom authentication providers and functionality through plugins
- **Rate Limiting**: Protection against brute force attacks
- **Password Policies**: Configurable password requirements with HaveIBeenPwned integration

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Authentication Providers](#authentication-providers)
  - [Local Provider](#local-provider)
  - [OAuth Providers](#oauth-providers)
  - [Passwordless Provider](#passwordless-provider)
  - [Custom Providers](#custom-providers)
- [Framework Integration](#framework-integration)
  - [Express](#express)
  - [NestJS](#nestjs)
  - [Fastify](#fastify)
  - [Hono](#hono)
- [Admin Management](#admin-management)
- [Multi-Factor Authentication](#multi-factor-authentication)
- [Session Management](#session-management)
- [Plugin System](#plugin-system)
- [API Reference](#api-reference)
- [Building](#building)
- [Running Tests](#running-tests)

## Installation

```bash
npm install @forgebase-ts/auth
# or
yarn add @forgebase-ts/auth
# or
pnpm add @forgebase-ts/auth
```

## Basic Usage

To get started with ForgeBase Auth, you'll need to set up a database connection (using Knex), create a configuration store, and initialize the authentication manager:

```typescript
import { DynamicAuthManager, KnexConfigStore, KnexUserService, BasicSessionManager, LocalAuthProvider, initializeAuthSchema } from '@forgebase-ts/auth';
import { knex } from 'knex';

// Initialize Knex instance
const db = knex({
  client: 'pg', // or any other supported database
  connection: {
    // connection details
  },
});

// Create database tables
await initializeAuthSchema(db);

// Initialize config store
const configStore = new KnexConfigStore(db);
await configStore.initialize();

// Get auth configuration
const config = await configStore.getConfig();

// Initialize user service
const userService = new KnexUserService(config, {
  knex: db,
  tableName: 'users',
});

// Set up auth providers
const providers = {
  local: new LocalAuthProvider(userService, config),
};

// Initialize session manager
const sessionManager = new BasicSessionManager('your-secret-key', config, db);

// Initialize auth manager
const authManager = new DynamicAuthManager(
  configStore,
  providers,
  sessionManager,
  userService,
  5000, // config refresh interval
  true, // enable config interval check
  { knex: db } // internal config
);
```

## Authentication Providers

### Local Provider

The local provider handles username/password authentication:

```typescript
import { LocalAuthProvider } from '@forgebase-ts/auth';

const localProvider = new LocalAuthProvider(userService, config);

// Usage examples
// Registration
const result = await authManager.register(
  'local',
  {
    email: 'user@example.com',
    name: 'John Doe',
  },
  'securePassword123'
);

// Login
const loginResult = await authManager.login('local', {
  email: 'user@example.com',
  password: 'securePassword123',
});
```

The local provider includes built-in password policy enforcement with the following configurable options:

- Minimum length
- Require uppercase/lowercase letters
- Require numbers
- Require special characters
- Integration with HaveIBeenPwned to reject compromised passwords

### OAuth Providers

ForgeBase Auth supports various OAuth providers like Google, GitHub, and more:

```typescript
import { GoogleOAuthProvider } from '@forgebase-ts/auth';

const googleProvider = new GoogleOAuthProvider({
  clientID: 'your-client-id',
  clientSecret: 'your-client-secret',
  callbackURL: 'http://localhost:3000/auth/oauth/callback',
  scopes: ['email', 'profile'],
  userService,
  knex: db,
  name: 'google',
});

// Add to providers
const providers = {
  local: localProvider,
  google: googleProvider,
};

// OAuth flow is handled through redirects
// Initiate OAuth login
const { url } = await authManager.login('google', {});

// Handle OAuth callback
const callbackResult = await authManager.oauthCallback('google', {
  code: 'auth-code-from-provider',
  state: 'state-from-provider',
});
```

### Passwordless Provider

For email or SMS based authentication without passwords:

```typescript
import { PasswordlessProvider } from '@forgebase-ts/auth';

const passwordlessProvider = new PasswordlessProvider({
  tokenStore: db,
  userService,
  sendToken: async (email, token) => {
    // Implement your email sending logic here
    console.log(`Sending token to ${email}: ${token}`);
  },
});

// Add to providers
const providers = {
  local: localProvider,
  passwordless: passwordlessProvider,
};

// Initiate passwordless login
await authManager.login('passwordless', { email: 'user@example.com' });

// Verify the token sent to the user
const { user, token } = await authManager.validateToken('token-from-email', 'passwordless');
```

### Custom Providers

You can create custom authentication providers by implementing the `AuthProvider` interface:

```typescript
import { AuthProvider, User } from '@forgebase-ts/auth';

class CustomAuthProvider<TUser extends User> implements AuthProvider<TUser> {
  async authenticate(credentials: Record<string, any>): Promise<TUser | null> {
    // Custom authentication logic
  }

  async register(userData: Partial<TUser>, password?: string): Promise<TUser> {
    // Custom registration logic
  }

  // Other required methods
}
```

## Framework Integration

### Express

```typescript
import express from 'express';
import { ExpressAuthAdapter } from '@forgebase-ts/auth';

const app = express();
app.use(express.json());

// Initialize Express auth adapter
const authAdapter = new ExpressAuthAdapter(authManager);

// Setup auth routes
authAdapter.setupRoutes(app);

// Protected route example
app.get('/protected', authAdapter.authenticate, (req, res) => {
  res.json({ message: 'This is a protected route', user: req['user'] });
});
```

### NestJS

```typescript
// auth.module.ts
import { Module } from '@nestjs/common';
import { NestAuthModule } from '@forgebase-ts/auth';
import { AuthConfigService } from './auth.config.service';

@Module({
  imports: [
    NestAuthModule.forRootAsync({
      useFactory: async (authConfigService: AuthConfigService) => {
        const { authManager, adminManager } = await authConfigService.initialize(db);
        return {
          authManager,
          adminManager,
          adminConfig: {
            basePath: '/admin',
            cookieName: 'admin_token',
          },
          config: {
            basePath: '/auth',
            cookieName: 'auth_token',
          },
        };
      },
      inject: [AuthConfigService],
      imports: [AuthModule],
    }),
  ],
  providers: [AuthConfigService],
  exports: [AuthConfigService],
})
export class AuthModule {}

// Using the auth guard
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@forgebase-ts/auth';

@Controller('protected')
export class ProtectedController {
  @Get()
  @UseGuards(AuthGuard)
  getProtectedData() {
    return { message: 'This is protected data' };
  }
}
```

### Fastify

```typescript
import Fastify from 'fastify';
import { FastifyAuthAdapter } from '@forgebase-ts/auth';

const app = Fastify();

// Initialize Fastify auth adapter
const authAdapter = new FastifyAuthAdapter(authManager);

// Setup auth routes with cookie support
authAdapter.setupRoutes(app, true);

// Protected route example
app.get('/protected', {
  preHandler: [authAdapter.authenticate],
  handler: async (request, reply) => {
    return { message: 'This is a protected route', user: request['user'] };
  },
});
```

### Hono

```typescript
import { Hono } from 'hono';
import { HonoAuthAdapter } from '@forgebase-ts/auth';

const app = new Hono();

// Initialize Hono auth adapter
const authAdapter = new HonoAuthAdapter(authManager);

// Setup auth routes
authAdapter.setupRoutes(app);

// Protected route example
app.get('/protected', authAdapter.authenticate, (c) => {
  return c.json({
    message: 'This is a protected route',
    user: c.get('user'),
  });
});
```

## Admin Management

ForgeBase Auth includes a built-in admin management system with role-based access control and audit logging:

```typescript
import { initializeNestAdminManager, createInternalAdminManager } from '@forgebase-ts/auth';

// Create admin manager
const adminManager = await initializeNestAdminManager({
  knex: db,
  configStore,
  jwtSecret: 'your-admin-jwt-secret',
  tokenExpiry: '24h',
});

// Enable admin feature in config
await configStore.updateConfig({
  adminFeature: {
    enabled: true,
    createInitialAdmin: true,
    initialAdminEmail: 'admin@example.com',
    initialAdminPassword: 'secureAdminPassword',
  },
});

// Admin login
const { admin, token } = await adminManager.login('admin@example.com', 'secureAdminPassword');

// Manage users as admin
const users = await adminManager.listUsers(1, 10);

// Create audit log entries
await adminManager.createAuditLog({
  admin_id: admin.id,
  action: 'USER_UPDATED',
  details: { userId: '123', changes: { role: 'manager' } },
});
```

## Multi-Factor Authentication

ForgeBase Auth provides robust support for Multi-Factor Authentication:

```typescript
// Enable MFA for a user
const { secret, uri } = await authManager.enableMfa(userId);

// Verify MFA setup with a valid TOTP code
const { recoveryCodes } = await authManager.enableMfa(userId, '123456');

// Verify MFA during login
const { token } = await authManager.verifyMfa(userId, '123456');

// Disable MFA
await authManager.disableMfa(userId, '123456');
```

Supported MFA methods:

- TOTP (Time-based One-Time Password)
- SMS verification
- Email verification

## Session Management

ForgeBase Auth supports multiple session management strategies:

### Basic Session

```typescript
const sessionManager = new BasicSessionManager('your-secret-key', config, db);
```

### JWT Session

```typescript
const jwtManager = new JwtSessionManager('your-jwt-secret', config, db);
```

## Plugin System

ForgeBase Auth has a powerful plugin system that allows you to extend its functionality:

```typescript
import { AuthPlugin } from '@forgebase-ts/auth';

// Create a custom auth plugin
class MyCustomPlugin implements AuthPlugin<User> {
  name = 'my-custom-plugin';
  version = '1.0.0';

  async initialize(authManager) {
    // Initialize your plugin
  }

  getProviders() {
    // Return custom auth providers
    return {
      custom: new MyCustomAuthProvider(),
    };
  }

  getHooks() {
    return {
      afterLogin: async (data) => {
        // Custom logic after login
      },
    };
  }
}

// Register the plugin
await authManager.registerPlugin(new MyCustomPlugin());
```

## API Reference

### DynamicAuthManager

```typescript
class DynamicAuthManager<TUser extends User> {
  constructor(configStore: ConfigStore, providers: Record<string, AuthProvider<TUser>>, sessionManager: SessionManager, userService: KnexUserService<TUser>, refreshInterval?: number, enableConfigIntervalCheck?: boolean, internalConfig: AuthInternalConfig<TUser>, verificationService?: VerificationService, plugins?: AuthPlugin<TUser>[]);

  // Core authentication methods
  async register(provider: string, credentials: Partial<TUser>, password: string);
  async login(provider: string, credentials: Record<string, string>);
  async oauthCallback(provider: string, { code, state }: { code: string; state: string });
  async validateToken(token: string, provider: string);
  async logout(token: string);

  // MFA methods
  async enableMfa(userId: string, code?: string);
  async verifyMfa(userId: string, code: string);
  async disableMfa(userId: string, code: string);

  // Verification methods
  async verifyEmail(userId: string, verificationCode: string);
  async verifySms(userId: string, verificationCode: string);

  // Plugin management
  async registerPlugin(plugin: AuthPlugin<TUser>);

  // Configuration
  getConfig();
  updateConfig(update: Partial<AuthConfig>, adminUser: TUser);
}
```

### InternalAdminManager

```typescript
class InternalAdminManager {
  constructor(knex: Knex, authProvider: AdminAuthProvider, sessionManager: AdminSessionManager, configStore: ConfigStore);

  // Core admin methods
  async initialize();
  async login(email: string, password: string);
  async validateToken(token: string);
  async logout(token: string);

  // Admin management
  async createAdmin(adminData: Partial<InternalAdmin>, password: string, creatorId?: string);
  async updateAdmin(adminId: string, adminData: Partial<InternalAdmin>, updaterId: string);
  async deleteAdmin(adminId: string, deleterId: string);
  async listAdmins(page?: number, limit?: number);

  // Audit logging
  async getAuditLogs(adminId?: string, page?: number, limit?: number);

  // Configuration
  async getAuthConfig();
  async updateAuthConfig(updates: Partial<AuthConfig>, adminId: string);
}
```

## Building

Run `nx build auth` to build the library.

## Running Tests

Run `nx test auth` to execute the unit tests via Jest.

## License

MIT
