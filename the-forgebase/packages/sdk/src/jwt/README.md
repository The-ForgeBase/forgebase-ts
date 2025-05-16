# ForgeBase JWT Verification SDK

A secure and efficient SDK for verifying JWTs in distributed systems using JSON Web Key Sets (JWKS). This SDK is framework-agnostic and provides built-in support for Express.js and Hono middleware.

## Features

- 🔒 Secure JWT verification using JWKS
- 🔑 Client identification for JWKS endpoint security
- 🔄 Automatic key rotation handling
- 💾 JWKS response caching with configurable TTL
- 🔁 Automatic retry with exponential backoff
- 🎯 TypeScript support with type inference
- 🛠️ Ready-to-use middleware for Express and Hono
- ✨ Zero external dependencies (uses Web Crypto API)

## Installation

```bash
npm install @forgebase-ts/sdk
# or
pnpm add @forgebase-ts/sdk
# or
yarn add @forgebase-ts/sdk
```

## Quick Start

```typescript
import { JWTVerifier } from '@forgebase-ts/sdk/jwt';

// Create a verifier instance
const verifier = new JWTVerifier({
  jwksUrl: 'https://api.yourdomain.com/.well-known/jwks.json',
  clientId: 'my-service-client-id', // Identify your client to the JWKS endpoint
  cacheTimeMs: 3600000, // Cache JWKS for 1 hour (optional)
  retryOnFail: true, // Auto-retry failed JWKS fetches (optional)
  maxRetries: 3, // Maximum retry attempts (optional)
});

// Define your custom payload type (optional)
interface MyPayload {
  sub: string; // User ID
  email: string; // User email
  roles: string[]; // User roles
  exp?: number; // Expiration time
  iat?: number; // Issued at time
}

// Verify a token
const token = 'your.jwt.token';
const result = await verifier.verify<MyPayload>(token);

if (result.isValid && result.payload) {
  console.log('Token verified:', result.payload);
  console.log('User ID:', result.payload.sub);
  console.log('User email:', result.payload.email);
  console.log('User roles:', result.payload.roles);
} else {
  console.error('Verification failed:', result.error);
}
```

## Express.js Middleware

```typescript
import { jwtAuthMiddleware } from '@forgebase-ts/sdk/jwt';
import express from 'express';

const app = express();
const verifier = new JWTVerifier({
  jwksUrl: 'https://api.yourdomain.com/.well-known/jwks.json',
});

// Add JWT authentication middleware
app.use(jwtAuthMiddleware(verifier));

// Protected route - req.user will contain the verified JWT payload
app.get('/protected', (req, res) => {
  res.json({
    message: 'Protected resource accessed successfully',
    user: req.user,
  });
});
```

## Hono Middleware

```typescript
import { honoJwtMiddleware } from '@forgebase-ts/sdk/jwt';
import { Hono } from 'hono';

const app = new Hono();
const verifier = new JWTVerifier({
  jwksUrl: 'https://api.yourdomain.com/.well-known/jwks.json',
});

// Add JWT authentication middleware
app.use('*', honoJwtMiddleware(verifier));

// Protected route - c.get('user') will contain the verified JWT payload
app.get('/protected', (c) => {
  return c.json({
    message: 'Protected resource accessed successfully',
    user: c.get('user'),
  });
});
```

## Security Considerations

1. **JWKS Endpoint**: Always use HTTPS for the JWKS endpoint to prevent man-in-the-middle attacks.

2. **Client Identification**: Use the `clientId` option to identify your client to the JWKS endpoint:

   ```typescript
   const verifier = new JWTVerifier({
     jwksUrl: '...',
     clientId: 'my-service-client-id', // Sent as X-Client header
   });
   ```

   This helps restrict access to only registered clients and provides better audit trails.

3. **Key Rotation**: The SDK automatically handles key rotation by checking the `kid` (Key ID) claim in the JWT header.

4. **Caching**: JWKS responses are cached by default to improve performance. Adjust `cacheTimeMs` based on your key rotation schedule.

5. **Validation**: The SDK performs standard JWT validations including:

   - Signature verification using the correct public key
   - Token expiration check (`exp` claim)
   - Issued at validation (`iat` claim)
   - Not before validation (`nbf` claim)
   - Key ID validation (`kid` header)

6. **Type Safety**: Use TypeScript interfaces to ensure your payload contains the expected fields.

## Error Handling

The SDK provides detailed error messages to help diagnose verification issues:

```typescript
const result = await verifier.verify(token);
if (!result.isValid) {
  switch (result.error) {
    case 'Token missing key ID (kid)':
      // Handle missing key ID
      break;
    case 'No matching key found for kid':
      // Handle key not found
      break;
    case 'Token expired':
      // Handle expired token
      break;
    default:
      // Handle other errors
      break;
  }
}
```

## Advanced Usage

### Manual Payload Decoding

For debugging purposes, you can decode a JWT payload without verification:

```typescript
const decoded = verifier.decode(token);
console.log('Decoded payload:', decoded);
// WARNING: This does not verify the token's signature!
```

### Custom Cache Time

Adjust the JWKS cache time based on your needs:

```typescript
const verifier = new JWTVerifier({
  jwksUrl: 'https://api.yourdomain.com/.well-known/jwks.json',
  cacheTimeMs: 24 * 60 * 60 * 1000, // Cache for 24 hours
});
```

### Retry Configuration

Configure automatic retry behavior for JWKS fetching:

```typescript
const verifier = new JWTVerifier({
  jwksUrl: 'https://api.yourdomain.com/.well-known/jwks.json',
  retryOnFail: true, // Enable automatic retry
  maxRetries: 5, // Maximum number of retry attempts
});
```

### Client Identification

Secure your JWKS endpoint by identifying clients:

```typescript
// Register your client ID with your auth service
const verifier = new JWTVerifier({
  jwksUrl: 'https://api.yourdomain.com/.well-known/jwks.json',
  clientId: 'my-service-client-id',
});
```

The SDK will include the client ID in an `X-Client` header when fetching the JWKS. Your auth service can then:

- Validate that the client is registered and authorized
- Rate limit requests per client
- Track JWKS usage by client
- Block unauthorized clients from accessing your JWKS endpoint

## Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.
