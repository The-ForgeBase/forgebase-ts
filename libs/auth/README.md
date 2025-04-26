# ForgeBase Auth

A flexible, comprehensive authentication library for Server side js applications, providing multiple authentication strategies, framework adapters, and advanced session management with JWKS support.

## Purpose

The ForgeBase Auth library simplifies the implementation of authentication in your applications by providing a unified interface for various authentication methods. It supports local authentication, OAuth providers, passwordless authentication, and custom authentication strategies, making it easy to secure your applications regardless of the underlying framework.

## Core Features

- **Multiple Authentication Methods**:

  - Local authentication with password
  - OAuth providers (Google, GitHub, etc.)
  - Passwordless authentication (email, SMS)
  - Multi-factor authentication (TOTP, SMS, email)

- **Advanced Session Management**:

  - JWKS (JSON Web Key Set) support with auto-rotation
  - Public key infrastructure for token verification
  - Basic, JWT, and JoseJWT session managers
  - Configurable token expiration and refresh
  - Secure cookie handling with customizable options

- **Framework Integration**:

  - Express.js adapter with middleware support
  - NestJS adapter with JWKS and admin features
  - Fastify adapter with cookie support
  - Hono adapter for edge compatibility

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

  - OpenID Connect discovery
  - OAuth 2.0 compliance
  - Key rotation policies
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
  - [Express](#express)
  - [NestJS](#nestjs)
  - [Fastify](#fastify)
  - [Hono](#hono)
- [Admin Management](#admin-management)
- [Multi-Factor Authentication](#multi-factor-authentication)
- [Email & Phone Verification](#email--phone-verification)
  - [Email Verification Service](#email-verification-service)
  - [JSX-Email Templates](#jsx-email-templates)
- [Password Reset](#password-reset)
  - [Password Reset Flow](#password-reset-flow)
  - [NestJS Integration](#nestjs-integration-1)
- [Session Management](#session-management)
- [User Table Extension](#user-table-extension)
- [Plugin System](#plugin-system)
- [Error Handling](#error-handling)
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

### 1. Basic Setup with JWKS Support

```typescript
import { DynamicAuthManager, KnexConfigStore, KnexUserService, JoseJwtSessionManager, LocalAuthProvider, initializeAuthSchema, KeyStorageOptions } from '@forgebase-ts/auth';
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

// Initialize config store
const configStore = new KnexConfigStore(db);
await configStore.initialize();

// Get auth configuration
const config = await configStore.getConfig();

// Configure key options for JWKS
const keyOptions: KeyStorageOptions = {
  keyDirectory: './keys', // Directory to store keys
  algorithm: 'RS256', // Use RS256 algorithm
  rotationDays: 90, // Key rotation interval
};

// Initialize JoseJwtSessionManager for JWT key signing
const joseJwtManager = new JoseJwtSessionManager(config, db, keyOptions);
await joseJwtManager.initialize();

// Initialize user service
const userService = new KnexUserService(config, {
  knex: db,
  tableName: 'users',
});

// Set up auth providers
const providers = {
  local: new LocalAuthProvider(userService, config),
};

// Initialize auth manager with JWKS support
const authManager = new DynamicAuthManager(
  configStore,
  providers,
  joseJwtManager, // Use JoseJwtManager for JWKS support
  userService,
  5000, // config refresh interval
  true, // enable config interval check
  { knex: db } // internal config
);

// Enable features in configuration
await configStore.updateConfig({
  enabledProviders: ['local'],
  adminFeature: {
    enabled: true,
    initialAdminEmail: 'admin@example.com',
    initialAdminPassword: 'secure-password',
    createInitialAdmin: true,
  },
});
```

### 2. NestJS Integration with JWKS

For NestJS applications, use the built-in module with JWKS support:

```typescript
// auth.config.service.ts
@Injectable()
export class AuthConfigService implements OnModuleInit {
  private authManager: DynamicAuthManager<AppUser>;
  private joseJwtManager: JoseJwtSessionManager;

  async initialize(db: Knex) {
    // Initialize config store
    const configStore = new KnexConfigStore(db);
    await configStore.initialize();

    // Configure JWKS
    const keyOptions: KeyStorageOptions = {
      keyDirectory: './keys',
      algorithm: 'RS256',
      rotationDays: 90,
    };

    this.joseJwtManager = new JoseJwtSessionManager(config, db, keyOptions);
    await this.joseJwtManager.initialize();

    // Initialize other components
    // ...

    return {
      authManager: this.authManager,
      adminManager,
      joseJwtManager: this.joseJwtManager,
    };
  }
}

// auth.module.ts
@Module({
  imports: [
    NestAuthModuleWithJWKS.forRootAsync({
      useFactory: async (authConfigService: AuthConfigService) => {
        const { authManager, adminManager, joseJwtManager } = await authConfigService.initialize(db);

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
          joseJwtManager,
        };
      },
      inject: [AuthConfigService],
      controllers: [AuthController, AdminController, JwksController],
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
  'securePassword123'
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
class CustomProvider implements AuthProvider<User> {
  constructor(private userService: KnexUserService<User>) {}

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
import { UserNotFoundError, InvalidCredentialsError, VerificationRequiredError, MFARequiredError } from '@forgebase-ts/auth';

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
- Maximum password attempts

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

  getConfig?(): Promise<Record<string, string>> {
    // Return provider configuration
  }

  validate?(token: string): Promise<TUser> {
    // Validate a token (for passwordless or other token-based flows)
  }
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

### NestJS Integration with JWKS

The library provides enhanced NestJS integration with JWKS support through `NestAuthModuleWithJWKS`:

```typescript
@Module({
  imports: [
    NestAuthModuleWithJWKS.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (authConfigService: AuthConfigService) => {
        const { authManager, adminManager, joseJwtManager } = await authConfigService.initialize(db);

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
          joseJwtManager, // Required for JWKS functionality
        };
      },
      inject: [AuthConfigService],
      controllers: [AuthController, AdminController, JwksController],
    }),
  ],
})
export class AppModule {}
```

### Setting up JoseJwtSessionManager

Initialize the JoseJwtSessionManager with proper key options:

```typescript
const keyOptions: KeyStorageOptions = {
  keyDirectory: './keys', // Directory to store keys
  algorithm: 'RS256', // Use RS256 algorithm
  rotationDays: 90, // Key rotation interval
};

const joseJwtManager = new JoseJwtSessionManager(config, db, keyOptions);
await joseJwtManager.initialize();

const authManager = new DynamicAuthManager(
  configStore,
  providers,
  joseJwtManager, // Use JoseJwtManager instead of BasicSessionManager
  userService,
  5000,
  true,
  { knex: db }
);
```

### JWKS Endpoints

When using `NestAuthModuleWithJWKS`, the following endpoints are automatically exposed:

- `GET /.well-known/jwks.json` - Returns the JWKS (JSON Web Key Set)

```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "current-key-id",
      "n": "public-key-modulus",
      "e": "AQAB",
      "alg": "RS256",
      "use": "sig"
    }
  ]
}
```

- `GET /.well-known/openid-configuration` - Returns OpenID configuration

```json
{
  "issuer": "https://your-domain.com",
  "jwks_uri": "https://your-domain.com/.well-known/jwks.json",
  "response_types_supported": ["code"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"]
}
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

- JWT token validation using JWKS
- Request context enrichment with admin data

Configure admin settings in your module:

```typescript
NestAuthModuleWithJWKS.forRootAsync({
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
const authManager = new DynamicAuthManager(
  configStore,
  providers,
  sessionManager,
  userService,
  5000,
  true,
  { knex: db },
  plunkVerificationService // Pass the verification service
);
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
import { BasicSessionManager } from '@forgebase-ts/auth';

const sessionManager = new BasicSessionManager('your-secret-key', config, db, {
  sessionDuration: '24h',
  cookieName: 'session_id',
  cookieOptions: {
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
  },
});

const authManager = new DynamicAuthManager(
  configStore,
  providers,
  sessionManager, // Use BasicSessionManager
  userService,
  5000,
  true,
  { knex: db }
);
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
import { JwtSessionManager } from '@forgebase-ts/auth';

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

const authManager = new DynamicAuthManager(
  configStore,
  providers,
  jwtManager, // Use JwtSessionManager
  userService,
  5000,
  true,
  { knex: db }
);
```

Features:

- Stateless token-based authentication
- Configurable token expiration
- Refresh token support
- Token blacklisting
- Claims-based authorization
- Encrypted payload

### 3. Jose JWT Session Manager (with JWKS)

Advanced session management using asymmetric key signing and JWKS:

```typescript
import { JoseJwtSessionManager, KeyStorageOptions } from '@forgebase-ts/auth';

const keyOptions: KeyStorageOptions = {
  keyDirectory: './keys', // Directory to store keys
  algorithm: 'RS256', // Signing algorithm
  rotationDays: 90, // Key rotation interval
  keySize: 2048, // RSA key size
};

const joseJwtManager = new JoseJwtSessionManager(config, db, keyOptions, {
  issuer: 'your-app',
  audience: 'your-api',
  tokenExpiry: '1h',
  refreshTokenExpiry: '7d',
  cookieName: 'jwt_token',
  cookieOptions: {
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
  },
});

// Initialize the manager (required for key setup)
await joseJwtManager.initialize();

const authManager = new DynamicAuthManager(
  configStore,
  providers,
  joseJwtManager, // Use JoseJwtSessionManager
  userService,
  5000,
  true,
  { knex: db }
);
```

Features:

- Public/private key infrastructure
- Automatic key rotation
- JWKS endpoint for public key distribution
- OpenID Connect discovery
- Forward secrecy
- Multiple key support
- Key rollover periods

### Session Features Comparison

| Feature                   | BasicSessionManager | JwtSessionManager | JoseJwtSessionManager |
| ------------------------- | :-----------------: | :---------------: | :-------------------: |
| Server-side Storage       |          ✓          |         ✓         |           ✓           |
| Stateless                 |          ✗          |         ✓         |           ✓           |
| Refresh Tokens            |          ✓          |         ✓         |           ✓           |
| Token Revocation          |          ✓          |         ✓         |           ✓           |
| Multiple Sessions         |          ✓          |         ✓         |           ✓           |
| Claims-based Auth         |          ✗          |         ✓         |           ✓           |
| Key Rotation              |          ✗          |         ✗         |           ✓           |
| JWKS Support              |          ✗          |         ✗         |           ✓           |
| Public Key Infrastructure |          ✗          |         ✗         |           ✓           |
| OpenID Connect            |          ✗          |         ✗         |           ✓           |

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

ForgeBase Auth provides a comprehensive API for extending the user table with custom fields:

```typescript
import { extendUserTable, UserFieldDefinition } from '@forgebase-ts/auth/utils';
import { Knex } from 'knex';

// Define your custom fields
const customFields: UserFieldDefinition[] = [
  {
    name: 'first_name',
    type: 'string',
    nullable: true,
    description: "User's first name",
    validation: {
      maxLength: 100,
    },
  },
  {
    name: 'last_name',
    type: 'string',
    nullable: true,
    description: "User's last name",
    validation: {
      maxLength: 100,
    },
  },
  {
    name: 'subscription_tier',
    type: 'string',
    nullable: false,
    default: 'free',
    description: "User's subscription tier",
    validation: {
      pattern: '^(free|basic|premium|enterprise)$',
    },
  },
  {
    name: 'organization_id',
    type: 'uuid',
    nullable: true,
    description: "Reference to the user's organization",
    foreignKeys: {
      columnName: 'organization_id',
      references: {
        tableName: 'organizations',
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

// Define your extended user type
import { User } from '@forgebase-ts/auth';

interface CustomUser extends User {
  first_name?: string;
  last_name?: string;
  subscription_tier: string;
}

// Use the extended type with auth services
const userService = new KnexUserService<CustomUser>(config, {
  knex,
  tableName: 'users',
});
```

### Migration Helpers

```typescript
import { addColumns, renameColumn, modifyColumn, dropColumns } from '@forgebase-ts/auth/utils';

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
import { validateUserDataWithZod } from '@forgebase-ts/auth/utils';

// Validate user data against field definitions
const validationResult = validateUserDataWithZod(userData, customFields);
if (!validationResult.valid) {
  console.error('Validation errors:', validationResult.errors);
}
```

### TypeScript Type Generation

```typescript
import { generateTypeInterface } from '@forgebase-ts/auth/utils';

// Generate TypeScript interface from field definitions
const typeCode = generateTypeInterface({
  interfaceName: 'CustomUser',
  fields: customFields,
});

console.log(typeCode);
// Output:
// import { User } from '@forgebase-ts/auth';
//
// /**
//  * Extended user interface with custom fields
//  */
// export interface CustomUser extends User {
//   first_name?: string;
//   last_name?: string;
//   subscription_tier: string;
// }
```

For more detailed information and examples, see the [User Extension Guide](./docs/user-extension-guide.md) and [User Table Schema](./docs/user-table.md) documentation.

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
function sanitizeUser<T extends User>(user: T): T;

// Sanitize an array of user objects
function sanitizeUsers<T extends User>(users: T[]): T[];
```

### DynamicAuthManager

```typescript
class DynamicAuthManager<TUser extends User> {
  constructor(configStore: ConfigStore, providers: Record<string, AuthProvider<TUser>>, sessionManager: SessionManager, userService: KnexUserService<TUser>, refreshInterval?: number, enableConfigIntervalCheck?: boolean, internalConfig: AuthInternalConfig<TUser>, EmailVerificationService?: EmailVerificationService, plugins?: AuthPlugin<TUser>[]);

  // Core authentication methods
  async register(provider: string, credentials: Partial<TUser>, password: string);
  async login(provider: string, credentials: Record<string, string>);
  async oauthCallback(provider: string, { code, state }: { code: string; state: string });
  async validateToken(token: string, provider: string);
  async logout(token: string);
  async refreshToken(refreshToken: string);
  async createToken(user: TUser): Promise<AuthToken | string>;

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
  async registerPlugin(plugin: AuthPlugin<TUser>);
  getPlugins(): AuthPlugin<TUser>[];

  // Provider management
  getProviders();
  getProvider(provider: string);
  getProviderConfig(provider: string);

  // Configuration
  getConfig();
  getMfaStatus();
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
