# ForgeBase Auth

A flexible, comprehensive authentication library for Server side js applications, providing multiple authentication strategies, a framework-agnostic web standard adapter, and advanced session management with dependency injection support.

## Database Setup & Migrations

### 1. Initialize Migration Files

After installing `@the-forgebase/auth`, run the initialization script in your project root:

```bash
pnpx forgebase-init-migrations
```

This will:
- Create a `knexfile.ts` template
- Set up the initial migration
- Add migration scripts to your package.json

### 2. Configure Your Database

Modify the generated `knexfile.ts` with your database settings:

```typescript
// knexfile.ts
export default {
  development: {
    client: 'pg', // or 'mysql', 'sqlite3', etc.
    connection: {
      // your database connection details
    },
    migrations: {
      directory: './migrations',
      extension: 'ts',
    },
  },
  // other environments...
};
```

### 3. Run Migrations

Use these commands to manage your database schema:

```bash
# Run all pending migrations
pnpm migrate

# Create a new migration file
pnpm migrate:make migration_name

# Rollback the last migration
pnpm migrate:rollback
```

### 4. Supported Databases

The auth library supports any database that Knex supports:
- PostgreSQL
- MySQL
- SQLite3
- Oracle
- MSSQL

Just update the `client` and `connection` settings in your `knexfile.ts` accordingly.

### 5. Admin Tables

By default, the initial migration will create both user and admin tables. If you don't need admin functionality, you can modify the migration file and set `enableAdmin` to `false`.

## Recent Updates

- **Dependency Injection**: Added comprehensive dependency injection support using Awilix for better modularity and testability
- **Removed JWKS Support**: Simplified the authentication flow by removing JWKS (JSON Web Key Set) support
- **Web Standard Adapter**: Replaced framework-specific adapters (Express, Fastify, Hono) with a single, framework-agnostic Web Standard Adapter
- **Restructured Types**: Improved TypeScript integration with a central `UserExtension` interface
- **Improved User Extension**: Enhanced the type system to make extending the User type more flexible and type-safe
- **Cross-Platform Token Validation**: Enhanced support for using tokens across different platforms

## Purpose

The ForgeBase Auth library simplifies the implementation of authentication in your applications by providing a unified interface for various authentication methods. It supports local authentication, OAuth providers, passwordless authentication, and custom authentication strategies, making it easy to secure your applications regardless of the underlying framework.

## Core Features

- **Multiple Authentication Methods**:

  - Local authentication with password
  - OAuth providers (Google, GitHub, etc.)
  - Passwordless authentication (email, SMS)
  - Multi-factor authentication (TOTP, SMS, email)

- **Advanced Session Management**:

  - Dependency Injection for flexible session management
  - Basic and JWT session managers
  - Configurable token expiration and refresh
  - Secure cookie handling with customizable options

- **Framework Integration**:

  - Web standard adapter with framework-agnostic design
  - NestJS adapter with dependency injection and admin features
  - Cross-platform token validation

- **Admin Management**:

  - Built-in admin user management
  - Role-based access control (RBAC)
  - Admin middleware for route protection
  - Comprehensive audit logging
  - Principle of least privilege enforcement

- **Security Features**:

  - OWASP compliant security practices
  - Brute force protection and rate limiting
  - Password policies with HaveIBeenPwned
  - Input validation and sanitization
  - User data sanitization for sensitive fields
  - CSRF protection
  - Security headers management

- **Database Integration**:

  - Knex-based user storage
  - Flexible schema configuration
  - Migration support
  - Real-time capabilities
  - Row-level security

- **Plugin System**:

  - Custom authentication providers
  - Event-based hooks
  - Extensible middleware
  - Custom storage adapters

- **Verification & MFA**:

  - Email verification with JSX-Email templates
  - Dynamic verification URLs
  - Password reset with token verification
  - SMS verification
  - TOTP support
  - Recovery codes
  - Backup methods

- **API Security**:

  - OAuth 2.0 compliance
  - Token revocation
  - Scope-based permissions

- **User Table Extension**:
  - Extend the user table with custom fields
  - TypeScript type generation for extended user models
  - Validation for custom fields
  - Migration helpers for schema changes
  - Best practices for user data extension

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Authentication Providers](#authentication-providers)
  - [Local Provider](#local-provider)
  - [OAuth Providers](#oauth-providers)
  - [Passwordless Provider](#passwordless-provider)
  - [Custom Providers](#custom-providers)
- [Framework Integration](#framework-integration)
  - [Web Standard Adapter](#web-standard-adapter)
  - [NestJS](#nestjs)
  - [NestJS Integration with DI](#nestjs-integration-with-di)
  - [Cross-Platform Token Validation](#cross-platform-token-validation)
- [Admin Management](#admin-management)
- [Multi-Factor Authentication](#multi-factor-authentication)
- [Email & Phone Verification](#email--phone-verification)
  - [Email Verification Service](#email-verification-service)
  - [JSX-Email Templates](#jsx-email-templates)
- [Password Reset](#password-reset)
  - [Password Reset Flow](#password-reset-flow)
  - [NestJS Integration](#nestjs-integration)
- [Session Management](#session-management)
- [User Table Extension](#user-table-extension)
- [Plugin System](#plugin-system)
- [Error Handling](#error-handling)
- [API Reference](#api-reference)
- [Building](#building)
- [Running Tests](#running-tests)

## Installation

```bash
npm install @the-forgebase/auth
# or
yarn add @the-forgebase/auth
# or
pnpm add @the-forgebase/auth
```

### Additional Dependencies

For JSX-Email templates and advanced email features, you'll need these additional dependencies:

```bash
npm install jsx-email react nodemailer uuid
# or
yarn add jsx-email react nodemailer uuid
# or
pnpm add jsx-email react nodemailer uuid
```

## Basic Usage

There are several ways to integrate ForgeBase Auth into your application. Here are the most common patterns:

### 1. Basic Setup with Dependency Injection

```typescript
import { createAuthContainer, initializeContainer, initializeAuthSchema } from '@the-forgebase/auth';
import { Knex } from 'knex';

// Initialize your database connection
const db = knex({
  client: 'postgres', // or any other supported database
  connection: {
    // connection details
  },
});

// Create necessary database tables
await initializeAuthSchema(db);

// Define dependencies
const deps = {
  knex: db,
  local: {
    enabled: true,
  },
  email: {
    enabled: true,
    usePlunk: {
      enabled: true,
      config: {
        apiKey: process.env.PLUNK_API_KEY,
        fromEmail: 'noreply@example.com',
        fromName: 'Your App',
      },
    },
  },
  sms: {
    enabled: false,
  },
  useJwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret',
    options: {
      expiresIn: '1h',
    },
  },
  adminConfig: {
    initialAdminEmail: 'admin@example.com',
    initialAdminPassword: 'secure-password',
    enabled: true,
    createInitialApiKey: true,
  },
  authPolicy: {
    emailVerificationRequired: true,
    passwordReset: true,
  },
};

// Create and initialize the container
const container = createAuthContainer(deps);
await initializeContainer(container);

// Access services from the container
const authManager = container.cradle.authManager;
const userService = container.cradle.userService;
const configStore = container.cradle.configStore;
```

### 2. NestJS Integration with Dependency Injection

For NestJS applications, use the built-in module with dependency injection support:

```typescript
// auth.config.service.ts
@Injectable()
export class AuthConfigService implements OnModuleInit {
  async initialize(db: Knex) {
    // Define dependencies
    const deps = {
      knex: db,
      local: {
        enabled: true,
      },
      email: {
        enabled: true,
        usePlunk: {
          enabled: true,
          config: {
            apiKey: process.env.PLUNK_API_KEY,
            fromEmail: 'noreply@example.com',
            fromName: 'Your App',
          },
        },
      },
      sms: {
        enabled: false,
      },
      useJwt: {
        secret: process.env.JWT_SECRET || 'your-jwt-secret',
        options: {
          expiresIn: '1h',
        },
      },
      adminConfig: {
        initialAdminEmail: 'admin@example.com',
        initialAdminPassword: 'secure-password',
        enabled: true,
        createInitialApiKey: true,
      },
      authPolicy: {
        emailVerificationRequired: true,
        passwordReset: true,
      },
    };

    // Create and initialize the container
    const container = createAuthContainer(deps);
    await initializeContainer(container);

    return {
      container
    };
  }
}

// auth.module.ts
@Module({
  imports: [
    NestAuthModule.forRootAsync({
      useFactory: async (authConfigService: AuthConfigService) => {
        const { container } = await authConfigService.initialize(db);

        return {
          container
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
      controllers: [AuthController, AdminController],
    }),
  ],
  providers: [AuthConfigService],
  exports: [AuthConfigService],
})
export class AuthModule {}
```

### 3. Basic Authentication Operations

Once configured, you can use the auth manager for common operations:

```typescript
// Registration
const newUser = await authManager.register(
  'local',
  {
    email: 'user@example.com',
    name: 'John Doe',
  },
  'securePassword123',
);

// Login
const { user, token } = await authManager.login('local', {
  email: 'user@example.com',
  password: 'securePassword123',
});

// Token Validation
const validated = await authManager.validateToken(token, 'local');

// Token Refresh
const newToken = await authManager.refreshToken(token);

// Logout
await authManager.logout(token);
```

### 4. Admin Operations

Handle administrative tasks using the admin manager:

```typescript
// Admin login
const { admin, token } = await adminManager.login('admin@example.com', 'secure-password');

// List users
const users = await adminManager.listUsers(1, 10);

// Update user
await adminManager.updateUser(userId, {
  role: 'premium',
  verified: true,
});

// Create audit log
await adminManager.createAuditLog({
  admin_id: admin.id,
  action: 'USER_UPDATED',
  details: { userId, changes: { role: 'premium' } },
});
```

### 5. Custom Provider Integration

Extend functionality by implementing custom providers:

```typescript
class CustomProvider implements AuthProvider {
  constructor(private userService: KnexUserService) {}

  async authenticate(credentials: Record<string, any>) {
    // Custom authentication logic
    return this.userService.findByEmail(credentials.email);
  }

  async register(userData: Partial<User>, password?: string) {
    // Custom registration logic
    return this.userService.create(userData);
  }
}

// Add to providers
const providers = {
  local: new LocalAuthProvider(userService, config),
  custom: new CustomProvider(userService),
};
```

### 6. Error Handling

Implement proper error handling for authentication operations:

```typescript
import { UserNotFoundError, InvalidCredentialsError, VerificationRequiredError, MFARequiredError } from '@the-forgebase/auth';

try {
  const result = await authManager.login('local', credentials);
} catch (error) {
  if (error instanceof UserNotFoundError) {
    // Handle user not found
  } else if (error instanceof InvalidCredentialsError) {
    // Handle invalid credentials
  } else if (error instanceof VerificationRequiredError) {
    // Handle verification required
  } else if (error instanceof MFARequiredError) {
    // Handle MFA required
  }
}
```

### 7. Security Best Practices

Always follow these security practices:

```typescript
// Configure secure cookies
const config = {
  cookieOptions: {
    secure: true, // HTTPS only
    httpOnly: true, // No JavaScript access
    sameSite: 'strict', // CSRF protection
    maxAge: 3600, // 1 hour expiry
  },
};

// Enable rate limiting
await configStore.updateConfig({
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },
});

// Enable MFA
await authManager.enableMfa(userId, {
  type: 'totp',
  backupCodes: 5,
});

// Implement proper password policies
await configStore.updateConfig({
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventCommonPasswords: true,
  },
});
```

## Authentication Providers

### Local Provider

The local provider handles username/password authentication:

```typescript
import { LocalAuthProvider } from '@the-forgebase/auth';

const localProvider = new LocalAuthProvider(userService, config);

// Usage examples
// Registration
const result = await authManager.register(
  'local',
  {
    email: 'user@example.com',
    name: 'John Doe',
  },
  'securePassword123',
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
- Maximum password attempts

### OAuth Providers

ForgeBase Auth supports various OAuth providers like Google, GitHub, and more:

```typescript
import { GoogleOAuthProvider } from '@the-forgebase/auth';

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
import { PasswordlessProvider } from '@the-forgebase/auth';

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
import { AuthProvider, User } from '@the-forgebase/auth';

class CustomAuthProvider implements AuthProvider {
  async authenticate(credentials: Record<string, any>): Promise<User | null> {
    // Custom authentication logic
  }

  async register(userData: Partial<User>, password?: string): Promise<User> {
    // Custom registration logic
  }

  getConfig?(): Promise<Record<string, string>> {
    // Return provider configuration
  }

  validate?(token: string): Promise<User> {
    // Validate a token (for passwordless or other token-based flows)
  }
}
```

## Framework Integration

> **Note:** The Fastify, and Hono adapters have been removed in favor of a more flexible, framework-agnostic Web Standard Adapter that works with any JavaScript framework or runtime that supports standard Web APIs.

### Web Standard Adapter

The Web Standard Adapter provides a framework-agnostic approach to authentication that can be used with any JavaScript framework or runtime that supports standard Web APIs.

```typescript
import { createWebAuthClient, webAuthApi } from '@the-forgebase/auth';

// Initialize the auth client with dependency injection
const { container, config } = createWebAuthClient({
  config: {
    basePath: '/auth',
    cookieName: 'auth_token',
    cookieOptions: {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    },
  },
  deps: {
    knex: knexInstance,
    local: {
      enabled: true,
    },
    email: {
      enabled: true,
    },
    sms: {
      enabled: false,
    },
    useJwt: {
      secret: 'your-jwt-secret',
      options: {
        expiresIn: '1h',
      },
    },
    adminConfig: {
      initialAdminEmail: 'admin@example.com',
      initialAdminPassword: 'secure-password',
      enabled: true,
      createInitialApiKey: true,
    },
    authPolicy: {
      emailVerificationRequired: true,
    },
  },
});

// Create the auth API
const authApi = webAuthApi({
  container,
  config,
  cors: {
    enabled: true,
    corsOptions: {
      origin: ['https://yourdomain.com'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  },
});

// Handle requests
async function handleRequest(req: Request): Promise<Response> {
  return authApi.handleRequest(req);
}
```

The Web Standard Adapter provides:

- Standard Web API compatibility (works with Request/Response)
- CORS support
- Cookie handling
- Middleware support
- Authentication endpoints
- User management
- Token validation

### NestJS

```typescript
// auth.module.ts
import { Module } from '@nestjs/common';
import { NestAuthModule } from '@the-forgebase/auth';
import { AuthConfigService } from './auth.config.service';

@Module({
  imports: [
    NestAuthModule.forRootAsync({
      useFactory: async (authConfigService: AuthConfigService) => {
        const { container, config } = await authConfigService.initialize(db);
        return {
          container,
          config: {
            basePath: '/auth',
            cookieName: 'auth_token',
          },
          adminConfig: {
            basePath: '/admin',
            cookieName: 'admin_token',
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
import { AuthGuard } from '@the-forgebase/auth';

@Controller('protected')
export class ProtectedController {
  @Get()
  @UseGuards(AuthGuard)
  getProtectedData() {
    return { message: 'This is protected data' };
  }
}
```

### NestJS Integration with DI

The library provides enhanced NestJS integration with dependency injection support through `NestAuthModule`:

```typescript
@Module({
  imports: [
    NestAuthModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (authConfigService: AuthConfigService) => {
        const { container, config } = await authConfigService.initialize(db);

        return {
          container,
          config: {
            basePath: '/auth',
            cookieName: 'auth_token',
          },
          adminConfig: {
            basePath: '/admin',
            cookieName: 'admin_token',
          },
        };
      },
      inject: [AuthConfigService],
      controllers: [AuthController, AdminController],
    }),
  ],
})
export class AppModule {}
```

### Setting up with Dependency Injection

The auth library now uses Awilix for dependency injection, making it more modular and testable:

```typescript
import { createAuthContainer, ContainerDependencies } from '@the-forgebase/auth';

// Define your dependencies
const deps: ContainerDependencies = {
  knex: db,
  local: {
    enabled: true,
  },
  email: {
    enabled: true,
    usePlunk: {
      enabled: true,
      config: {
        apiKey: process.env.PLUNK_API_KEY,
        fromEmail: 'noreply@example.com',
        fromName: 'Your App',
      },
    },
  },
  sms: {
    enabled: false,
  },
  useJwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret',
    options: {
      expiresIn: '1h',
    },
  },
  adminConfig: {
    initialAdminEmail: 'admin@example.com',
    initialAdminPassword: 'secure-password',
    enabled: true,
    createInitialApiKey: true,
  },
  authPolicy: {
    emailVerificationRequired: true,
    passwordReset: true,
  },
};

// Create the container
const container = createAuthContainer(deps);

// Access services from the container
const authManager = container.cradle.authManager;
const userService = container.cradle.userService;
const sessionManager = container.cradle.sessionManager;
```

### Admin Middleware

The library includes middleware for handling admin authentication and access control:

```typescript
@Module({
  // ... module configuration
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply globally
    consumer.apply(AdminMiddleware).forRoutes('*');

    // Or apply to specific routes
    consumer.apply(AdminMiddleware).forRoutes({ path: '/admin/*', method: RequestMethod.ALL }, { path: '/api/protected/*', method: RequestMethod.ALL });
  }
}
```

The AdminMiddleware provides:

- JWT token validation
- Request context enrichment with admin data

Configure admin settings in your module:

```typescript
NestAuthModule.forRootAsync({
  // ...other config
  adminConfig: {
    basePath: '/admin',
    cookieName: 'admin_token',
    tokenExpiry: '24h',
    refreshToken: true,
    auditLog: true,
  },
});
```

### Cross-Platform Token Validation

The library supports cross-platform token validation, allowing tokens to be used across different platforms:

```typescript
// Web app validating a token from a mobile app
import { JwtSessionManager } from '@the-forgebase/auth';

// Create a JWT session manager with the same secret
const jwtManager = new JwtSessionManager('your-jwt-secret', config, db, {
  tokenExpiry: '1h',
  refreshTokenExpiry: '7d',
});

// Validate a token
const result = await jwtManager.validateToken(token);
if (result) {
  // Token is valid, user data is available
  const userData = result.user;
}
```

## Admin Management

ForgeBase Auth includes a built-in admin management system with role-based access control and audit logging:

```typescript
import { createAuthContainer } from '@the-forgebase/auth';

// Create container with admin configuration
const container = createAuthContainer({
  knex: db,
  local: { enabled: true },
  email: { enabled: false },
  sms: { enabled: false },
  adminConfig: {
    initialAdminEmail: 'admin@example.com',
    initialAdminPassword: 'secure-password',
    enabled: true,
    createInitialApiKey: true,
  },
  authPolicy: {},
});

// Get the admin manager from the container
const adminManager = container.cradle.adminManager;

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
// Enable MFA for a user (first step - get QR code)
const { secret, uri } = await authManager.enableMfa(userId);

// Verify MFA setup with a valid TOTP code (second step - verify and enable)
const { recoveryCodes } = await authManager.enableMfa(userId, '123456');

// Verify MFA during login
const { token } = await authManager.verifyMfa(userId, '123456');

// Disable MFA (requires current MFA code or recovery code)
await authManager.disableMfa(userId, '123456');
```

Supported MFA methods:

- TOTP (Time-based One-Time Password)
- SMS verification
- Email verification

## Email & Phone Verification

The library provides built-in support for verifying user email and phone numbers with enhanced features for email templates and dynamic URLs:

```typescript
// Send verification email (with optional custom redirect URL)
await authManager.sendVerificationEmail(email, 'https://custom-app.com/verify');

// Get the verification token (useful for testing or custom flows)
const verificationToken = await authManager.sendVerificationEmail(email);

// Verify email with code
const { user, token } = await authManager.verifyEmail(userId, verificationCode);

// Send verification SMS
await authManager.sendVerificationSms(phone);

// Verify phone number with code
const { user, token } = await authManager.verifySms(userId, verificationCode);
```

### Email Verification Service

The library includes a flexible email verification service with support for different email providers and templates:

```typescript
// Initialize with Plunk email service
const plunkVerificationService = new PlunkEmailVerificationService(db, {
  apiKey: process.env.PLUNK_API_KEY,
  fromEmail: 'noreply@yourdomain.com',
  fromName: 'Your App',
  tokenExpiryMinutes: 30,

  // Use nodemailer with Plunk SMTP
  useNodemailer: true,

  // URL bases for verification and reset links
  verificationUrlBase: 'https://yourdomain.com/verify',
  resetUrlBase: 'https://yourdomain.com/reset-password',

  // Use JSX-Email templates
  useJsxTemplates: true,

  // Additional query parameters for URLs
  additionalQueryParams: {
    source: 'email',
  },
});

// Register the service with the auth manager
// With dependency injection
const container = createAuthContainer({
  knex: db,
  local: { enabled: true },
  email: {
    enabled: true,
    emailVerificationService: plunkVerificationService,
  },
  sms: { enabled: false },
  configStore,
  sessionManager,
  authPolicy: {},
});

const authManager = container.cradle.authManager;
```

### JSX-Email Templates

The library supports JSX-Email templates for beautiful, responsive emails:

```typescript
// Create a custom email template
import * as React from 'react';
import { Body, Button, Container, Head, Heading, Html, Text } from 'jsx-email';

interface VerifyEmailProps {
  url: string;
  username?: string;
}

export const VerifyEmailTemplate = ({ url, username = 'there' }: VerifyEmailProps) => {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Heading>Email Verification</Heading>
          <Text>Hello {username}!</Text>
          <Text>Please verify your email by clicking the button below:</Text>
          <Button href={url}>Verify Email</Button>
        </Container>
      </Body>
    </Html>
  );
};

// Generate HTML from the template
import { render } from 'jsx-email';
const html = await render(VerifyEmailTemplate({ url: 'https://example.com/verify?token=abc123' }));
```

## Password Reset

The library provides a comprehensive password reset flow with support for token-based verification and custom URLs:

```typescript
// Send password reset email (with optional custom redirect URL)
await authManager.sendPasswordResetEmail(email, 'https://custom-app.com/reset-password');

// Get the reset token (useful for testing or custom flows)
const resetToken = await authManager.sendPasswordResetEmail(email);

// Verify a reset token
const isValid = await authManager.verifyPasswordResetToken(userId, resetToken);

// Reset password with token
const success = await authManager.resetPassword(userId, 'newSecurePassword', resetToken);
```

### Password Reset Flow

The typical password reset flow works as follows:

1. **Request Password Reset**:

   ```typescript
   // User requests password reset
   const resetToken = await authManager.sendPasswordResetEmail(userEmail, 'https://app.com/reset');
   ```

2. **User Receives Email**:
   The user receives an email with a link containing the reset token.

3. **Verify Token** (optional):

   ```typescript
   // Frontend extracts token from URL and verifies it
   const isValid = await authManager.verifyPasswordResetToken(userId, token);
   if (isValid) {
     // Show password reset form
   }
   ```

4. **Reset Password**:

   ```typescript
   // User submits new password with token
   const success = await authManager.resetPassword(userId, newPassword, token);
   ```

### NestJS Integration

The library includes NestJS endpoints for password reset:

```typescript
// Controller endpoints
@Post('forgot-password')
async forgotPassword(@Body('email') email: string, @Body('redirectUrl') redirectUrl?: string) {
  const token = await this.authService.sendPasswordResetEmail(email, redirectUrl);
  return { success: true, message: 'Password reset email sent', token };
}

@Post('verify-reset-token')
async verifyResetToken(@Body('userId') userId: string, @Body('token') token: string) {
  const isValid = await this.authService.verifyPasswordResetToken(userId, token);
  return { valid: isValid };
}

@Post('reset-password')
async resetPassword(
  @Body('userId') userId: string,
  @Body('token') token: string,
  @Body('newPassword') newPassword: string
) {
  const success = await this.authService.resetPassword(userId, newPassword, token);
  return { success };
}
```

## Session Management

ForgeBase Auth provides three different session management strategies to suit different use cases:

### 1. Basic Session Manager

The simplest session management strategy using server-side sessions:

```typescript
import { BasicSessionManager } from '@the-forgebase/auth';

const sessionManager = new BasicSessionManager('your-secret-key', config, db, {
  sessionDuration: '24h',
  cookieName: 'session_id',
  cookieOptions: {
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
  },
});

// With dependency injection
const container = createAuthContainer({
  knex: db,
  local: { enabled: true },
  email: { enabled: true },
  sms: { enabled: false },
  configStore,
  sessionManager,
  authPolicy: {},
});

const authManager = container.cradle.authManager;
```

Features:

- Server-side session storage
- Session expiration and cleanup
- Encrypted session data
- Session invalidation support
- Multiple concurrent sessions
- Session data persistence

### 2. JWT Session Manager

Stateless session management using JSON Web Tokens:

```typescript
import { JwtSessionManager } from '@the-forgebase/auth';

const jwtManager = new JwtSessionManager('your-jwt-secret', config, db, {
  tokenExpiry: '1h',
  refreshTokenExpiry: '7d',
  issuer: 'your-app',
  audience: 'your-api',
  cookieName: 'jwt_token',
  cookieOptions: {
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
  },
});

// With dependency injection
const container = createAuthContainer({
  knex: db,
  local: { enabled: true },
  email: { enabled: true },
  sms: { enabled: false },
  configStore,
  sessionManager: jwtManager,
  authPolicy: {},
});

const authManager = container.cradle.authManager;
```

Features:

- Stateless token-based authentication
- Configurable token expiration
- Refresh token support
- Token blacklisting
- Claims-based authorization
- Encrypted payload

### Session Features Comparison

| Feature             | BasicSessionManager | JwtSessionManager |
| ------------------- | :-----------------: | :---------------: |
| Server-side Storage |          ✓          |         ✓         |
| Stateless           |          ✗          |         ✓         |
| Refresh Tokens      |          ✓          |         ✓         |
| Token Revocation    |          ✓          |         ✓         |
| Multiple Sessions   |          ✓          |         ✓         |
| Claims-based Auth   |          ✗          |         ✓         |

### Common Operations

All session managers support these common operations:

```typescript
// Create a session/token
const token = await sessionManager.createToken(user);

// Validate a session/token
const validated = await sessionManager.validateToken(token);

// Refresh a token
const newToken = await sessionManager.refreshToken(oldToken);

// Invalidate a session/token
await sessionManager.invalidateToken(token);

// Get session/token data
const data = await sessionManager.getTokenData(token);
```

### Security Best Practices

1. **Token Storage**:

   - Store tokens in httpOnly cookies
   - Enable secure flag for HTTPS
   - Use strict same-site policy

2. **Token Expiration**:

   - Short-lived access tokens (1h or less)
   - Longer-lived refresh tokens (days)
   - Regular token rotation

3. **Key Management** (JoseJwtSessionManager):

   - Regular key rotation (90 days recommended)
   - Secure key storage
   - Proper key size (RSA 2048+ bits)

4. **Token Validation**:

   - Verify signature
   - Check expiration
   - Validate issuer and audience
   - Verify claims

5. **User Data Sanitization**:
   - Remove sensitive fields before sending to clients
   - Sanitize user objects in all auth responses
   - Protect password hashes, MFA secrets, and recovery codes

Example security configuration:

```typescript
const securityConfig = {
  cookieOptions: {
    secure: true, // HTTPS only
    httpOnly: true, // No JavaScript access
    sameSite: 'strict', // CSRF protection
    maxAge: 3600, // 1 hour expiry
  },
  tokenOptions: {
    expiresIn: '1h', // Short-lived tokens
    refreshIn: '7d', // Weekly refresh
    audience: 'api', // Intended recipients
    issuer: 'auth', // Token issuer
  },
  keyOptions: {
    // For JoseJwtSessionManager
    algorithm: 'RS256',
    keySize: 2048,
    rotationDays: 90,
    removeExpiredKeys: true,
  },
};
```

## User Table Extension

ForgeBase Auth provides a comprehensive API for extending the user table with custom fields. The library has been restructured to make user extension more flexible and type-safe.

### UserExtension Interface

The library now uses a central `UserExtension` interface that can be extended to add custom fields to the user model. Here's an example of how you might extend it with business-related fields:

```typescript
// Example: Extending the UserExtension interface with business information fields
declare module '@the-forgebase/auth/types' {
  interface UserExtension {
    company_name?: string;
    job_title?: string;
    department?: string;
    employee_id?: string;
    business_phone?: string;
    business_email?: string;
    tax_id?: string;
    company_size?: string;
    industry?: string;
    business_address?: {
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    };
    company_id?: string;
  }
}
```

This approach provides better TypeScript integration and ensures that your custom fields are recognized throughout the auth library.

### Adding Custom Fields to the Database

```typescript
import { extendUserTable, UserFieldDefinition } from '@the-forgebase/auth/utils';
import { Knex } from 'knex';

// Example: Define custom fields that match your UserExtension interface
const customFields: UserFieldDefinition[] = [
  {
    name: 'company_name',
    type: 'string',
    nullable: true,
    description: "User's company name",
    validation: {
      maxLength: 100,
    },
  },
  {
    name: 'job_title',
    type: 'string',
    nullable: true,
    description: "User's job title",
    validation: {
      maxLength: 100,
    },
  },
  {
    name: 'business_phone',
    type: 'string',
    nullable: true,
    description: "User's business phone number",
    validation: {
      pattern: '^\\+?[0-9]{10,15}$',
    },
  },
  {
    name: 'business_email',
    type: 'string',
    nullable: true,
    description: "User's business email address",
    validation: {
      isEmail: true,
    },
  },
  {
    name: 'business_address',
    type: 'json',
    nullable: true,
    description: "User's business address",
  },
  {
    name: 'company_id',
    type: 'uuid',
    nullable: true,
    description: "Reference to the user's company",
    foreignKeys: {
      columnName: 'company_id',
      references: {
        tableName: 'companies',
        columnName: 'id',
      },
    },
  },
];

// Extend the user table
async function setupCustomFields(knex: Knex) {
  await extendUserTable(knex, {
    fields: customFields,
    migrateExisting: true,
  });
}
```

### Using the Extended User Type

The User type is now automatically extended with your custom fields:

```typescript
import { User, KnexUserService } from '@the-forgebase/auth';

// The User type already includes your custom fields
// No need to create a custom interface

// Use the user service with the extended User type
const userService = new KnexUserService(config, {
  knex,
  tableName: 'users',
});

// Example of using the extended fields (assuming you've extended with business fields)
async function updateUserBusinessInfo(userId: string, businessInfo: Partial<User>) {
  const user = await userService.findUserById(userId);

  // Access your custom fields
  console.log(user.company_name);
  console.log(user.business_address?.city);

  // Update with your custom fields
  return userService.updateUser(userId, {
    company_name: businessInfo.company_name,
    job_title: businessInfo.job_title,
    business_phone: businessInfo.business_phone,
    business_email: businessInfo.business_email,
    business_address: businessInfo.business_address,
  });
}
```

### Migration Helpers

```typescript
import { addColumns, renameColumn, modifyColumn, dropColumns } from '@the-forgebase/auth/utils';

// Add new columns
await addColumns(knex, {
  fields: [
    {
      name: 'new_field',
      type: 'string',
      nullable: true,
    },
  ],
});

// Rename a column
await renameColumn(knex, {
  oldName: 'old_field_name',
  newName: 'new_field_name',
});

// Modify a column
await modifyColumn(knex, {
  field: {
    name: 'existing_field',
    type: 'string',
    nullable: false,
    default: 'new default',
  },
});

// Drop columns
await dropColumns(knex, {
  columnNames: ['field_to_drop'],
});
```

### Validation

```typescript
import { validateUserDataWithZod } from '@the-forgebase/auth/utils';

// Validate user data against field definitions
const validationResult = validateUserDataWithZod(userData, customFields);
if (!validationResult.valid) {
  console.error('Validation errors:', validationResult.errors);
}
```

### Common Extension Patterns

The library provides several common extension patterns:

1. **Business Information** - Company details, job titles, business contact info
2. **Profile Data** - Personal details, social links, avatars
3. **User Preferences** - Theme, language, notification settings
4. **Roles and Permissions** - Access control, custom claims

Another example of extending with roles and permissions:

```typescript
// Example: Extending with roles and permissions
declare module '@the-forgebase/auth/types' {
  interface UserExtension {
    role?: string;
    permissions?: string[];
    is_admin?: boolean;
    access_level?: number;
    role_assigned_at?: Date;
    role_expires_at?: Date | null;
    restricted_access?: boolean;
    custom_claims?: Record<string, any>;
  }
}
```

For more detailed information and examples, see the [User Extension Guide](./docs/user-extension-guide.md) and [User Table Schema](./docs/user-table.md) documentation.

## Plugin System

ForgeBase Auth has a powerful plugin system that allows you to extend its functionality:

```typescript
import { AuthPlugin } from '@the-forgebase/auth';

// Create a custom auth plugin
class MyCustomPlugin implements AuthPlugin {
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
      beforeLogin: async (data) => {
        // Custom logic before login
      },
      afterRegister: async (data) => {
        // Custom logic after registration
      },
    };
  }
}

// Register the plugin
await authManager.registerPlugin(new MyCustomPlugin());
```

## Error Handling

The library provides a comprehensive set of error classes for different authentication scenarios:

```typescript
try {
  await authManager.login('local', credentials);
} catch (error) {
  if (error instanceof UserNotFoundError) {
    // Handle user not found
  } else if (error instanceof InvalidCredentialsError) {
    // Handle invalid credentials
  } else if (error instanceof VerificationRequiredError) {
    // Handle verification required
  } else if (error instanceof MFARequiredError) {
    // Handle MFA required
  } else if (error instanceof RateLimitExceededError) {
    // Handle rate limit exceeded
  }
}
```

## API Reference

### Utility Functions

```typescript
// Sanitize a user object by removing sensitive fields
function sanitizeUser(user: User): User;

// Sanitize an array of user objects
function sanitizeUsers(users: User[]): User[];
```

### DynamicAuthManager

```typescript
class DynamicAuthManager {
  constructor(knex: Knex, configStore: ConfigStore, providers: Record<string, AuthProvider>, sessionManager: SessionManager, userService: KnexUserService, refreshInterval?: number, enableConfigIntervalCheck?: boolean, emailVerificationService?: EmailVerificationService, smsVerificationService?: SmsVerificationService, mfaService?: MfaService, rateLimiter?: RateLimiter, plugins?: AuthPlugin[]);

  // Core authentication methods
  async register(provider: string, credentials: Partial<User>, password: string);
  async login(provider: string, credentials: Record<string, string>);
  async oauthCallback(provider: string, { code, state }: { code: string; state: string });
  async validateToken(token: string, provider: string);
  async logout(token: string);
  async refreshToken(refreshToken: string);
  async createToken(user: User): Promise<AuthToken | string>;

  // MFA methods
  async enableMfa(userId: string, code?: string);
  async verifyMfa(userId: string, code: string);
  async disableMfa(userId: string, code: string);

  // Verification methods
  async verifyEmail(userId: string, verificationCode: string);
  async verifySms(userId: string, verificationCode: string);
  async sendVerificationEmail(email: string);
  async sendVerificationSms(phone: string);

  // Password management
  async resetPassword(userId: string, newPassword: string, token?: string): Promise<boolean>;
  async sendPasswordResetEmail(email: string, resetUrl?: string): Promise<string | void>;
  async verifyPasswordResetToken(userId: string, token: string): Promise<boolean>;

  // Plugin management
  async registerPlugin(plugin: AuthPlugin);
  getPlugins(): AuthPlugin[];

  // Provider management
  getProviders();
  getProvider(provider: string);
  getProviderConfig(provider: string);

  // Configuration
  getConfig();
  getMfaStatus();
  updateConfig(update: Partial<AuthConfig>, adminUser: User);
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
  async findAdminById(id: string): Promise<InternalAdmin | null>;
  async findAdminByEmail(email: string): Promise<InternalAdmin | null>;

  // User management
  async listUsers(page?: number, limit?: number);
  async getUser(userId: string);
  async updateUser(userId: string, userData: Partial<User>);
  async deleteUser(userId: string);

  // Audit logging
  async createAuditLog(logData: { admin_id: string; action: string; details?: object });
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
