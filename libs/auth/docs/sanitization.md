# User Data Sanitization

## Overview

The auth library includes utility functions to sanitize user data before sending it to clients. This is important for security reasons, as it prevents sensitive information like password hashes and MFA secrets from being exposed.

## Utility Functions

### `sanitizeUser(user)`

Removes sensitive fields from a user object.

```typescript
import { sanitizeUser } from '@forgebase-ts/auth';

// Example usage
const sanitizedUser = sanitizeUser(user);
```

### `sanitizeUsers(users)`

Sanitizes an array of user objects.

```typescript
import { sanitizeUsers } from '@forgebase-ts/auth';

// Example usage
const sanitizedUsers = sanitizeUsers(userArray);
```

## Sensitive Fields

The following fields are automatically removed from user objects:

- `password_hash`
- `mfa_secret`
- `mfa_recovery_codes`
- `password`
- `passwordHash`
- `mfaSecret`
- `mfaRecoveryCodes`
- `recovery_codes`
- `recoveryCodes`

## Implementation Details

The sanitization is automatically applied in the auth manager for all methods that return user data, including:

- Login
- Register
- OAuth callback
- Token validation
- Email verification
- SMS verification

## Custom Sanitization

If you need to sanitize user data in your own code, you can import and use the `sanitizeUser` function directly:

```typescript
import { sanitizeUser } from '@forgebase-ts/auth';

// In your API endpoint or service
const userData = await getUserData();
return {
  user: sanitizeUser(userData),
  // other response data
};
```

## Security Considerations

Always ensure that sensitive user data is sanitized before sending it to clients. This is especially important for:

- API responses
- WebSocket messages
- Server-side rendering contexts that might expose data to the client

When in doubt, use the `sanitizeUser` utility to ensure sensitive data is removed.
