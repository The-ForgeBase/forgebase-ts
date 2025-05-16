import { Context } from 'hono';
import { NextFunction, Request, Response } from 'express';
import { JWTVerifier, StandardJWTPayload } from './index';

// Example showing how to use the JWT verification SDK
export async function example(): Promise<void> {
  // Create a verifier instance with client identification
  const verifier = new JWTVerifier({
    jwksUrl: 'https://api.yourdomain.com/.well-known/jwks.json',
    clientId: 'my-service-client-id', // Add client identifier
    cacheTimeMs: 3600000, // Cache JWKS for 1 hour
    retryOnFail: true, // Auto-retry failed JWKS fetches
    maxRetries: 3, // Maximum retry attempts
  });

  // Define your custom payload type
  interface MyPayload extends StandardJWTPayload {
    email: string;
    roles: string[];
    permissions: string[];
  }

  // Example token verification
  const token = 'your.jwt.token';
  const result = await verifier.verify<MyPayload>(token);

  if (result.isValid && result.payload) {
    // Token is valid, use the payload
    console.log('User ID:', result.payload.sub);
    console.log('Email:', result.payload.email);
    console.log('Roles:', result.payload.roles);

    // Check permissions
    if (result.payload.permissions.includes('admin')) {
      console.log('User is an admin');
    }
  } else {
    // Token is invalid
    console.error('Verification failed:', result.error);
  }

  // You can also decode a token without verifying it
  // WARNING: This is unsafe and should only be used for debugging!
  const decoded = verifier.decode<MyPayload>(token);
  console.log('Decoded (unverified) payload:', decoded);
}

// Extend Express Request to include user
declare module 'express' {
  interface Request {
    user?: StandardJWTPayload;
  }
}

/**
 * Create an Express.js middleware for JWT authentication
 *
 * @param verifier JWTVerifier instance
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * const verifier = new JWTVerifier({ jwksUrl: '...' });
 * app.use(jwtAuthMiddleware(verifier));
 * ```
 */
export function jwtAuthMiddleware(verifier: JWTVerifier) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const result = await verifier.verify(token);
    if (!result.isValid) {
      return res.status(401).json({ error: result.error });
    }

    // Add the verified payload to the request
    req.user = result.payload;
    next();
  };
}

/**
 * Create a Hono middleware for JWT authentication
 *
 * @param verifier JWTVerifier instance
 * @returns Hono middleware function
 *
 * @example
 * ```typescript
 * const verifier = new JWTVerifier({ jwksUrl: '...' });
 * app.use('*', honoJwtMiddleware(verifier));
 * ```
 */
export function honoJwtMiddleware(verifier: JWTVerifier) {
  return async (c: Context, next: () => Promise<void>) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const result = await verifier.verify(token);
    if (!result.isValid) {
      return c.json({ error: result.error }, 401);
    }

    // Add the verified payload to the context
    c.set('user', result.payload);
    await next();
  };
}
