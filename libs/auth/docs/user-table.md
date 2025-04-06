# User Table Schema

## Overview

The ForgeBase Auth library uses a default user table schema that provides essential fields for authentication and user management. This document outlines the default schema and explains how to extend it with custom fields.

## Default Schema

The default user table is created with the following schema:

| Field Name | Type | Description | Nullable | Default |
|------------|------|-------------|----------|---------|
| id | uuid | Primary key identifier | No | UUID generated |
| email | string | User's email address | No | None |
| phone | string | User's phone number | Yes | None |
| name | string | User's display name | Yes | None |
| picture | string | URL to user's profile picture | Yes | None |
| password_hash | string | Hashed password | Yes | None |
| email_verified | boolean | Whether email is verified | No | false |
| phone_verified | boolean | Whether phone is verified | No | false |
| mfa_enabled | boolean | Whether MFA is enabled | No | false |
| mfa_secret | string | Secret for MFA | Yes | None |
| mfa_recovery_codes | json | Recovery codes for MFA | Yes | None |
| last_login_at | timestamp | Last login timestamp | Yes | None |
| created_at | timestamp | Creation timestamp | No | Current time |
| updated_at | timestamp | Last update timestamp | No | Current time |

## TypeScript Types

The user table schema is represented in TypeScript with the following types:

```typescript
// Base user interface with required fields
export interface BaseUser {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  picture?: string;
  password_hash?: string;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: Date;
  updated_at: Date;
  mfa_enabled: boolean;
  mfa_secret?: string;
  mfa_recovery_codes?: string[];
  last_login_at?: Date;
}

// Generic type for extending with custom fields
export type User<T extends Record<string, unknown> = {}> = BaseUser & T;
```

## Related Tables

The auth system also creates several related tables:

1. **oauth_accounts**: Stores OAuth provider connections
2. **sessions**: Manages user sessions
3. **verification_tokens**: Handles email/phone verification and password reset
4. **access_tokens**: Manages API access tokens
5. **api_keys**: Stores user API keys

These tables have foreign key relationships to the user table through the `user_id` field.

## Next Steps

To learn how to extend the user table with custom fields, see the [User Extension Guide](./user-extension-guide.md).
