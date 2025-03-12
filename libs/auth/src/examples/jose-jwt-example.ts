import { Knex } from 'knex';
import { JoseJwtSessionManager, KeyStorageOptions } from '../session/jose-jwt';
import { JwkController } from '../controllers/jwks-controller';
import { AuthConfig } from '../types';
import { TokenVerifier } from '../utils/token-verifier';
import express from 'express';
import { Hono } from 'hono';

/**
 * Example showing how to set up JoseJwtSessionManager with Express
 */
export async function setupWithExpress(
  db: Knex,
  config: AuthConfig
): Promise<any> {
  // Configure the options for JoseJwtSessionManager
  const keyOptions: KeyStorageOptions = {
    keyDirectory: './keys', // Directory to store keys
    algorithm: 'ES256', // Use ES256 algorithm (ECDSA with P-256 curve)
    rotationDays: 90, // Rotate keys every 90 days
  };

  // Create and initialize the session manager
  const joseJwtManager = new JoseJwtSessionManager(config, db, keyOptions);
  await joseJwtManager.initialize();

  // Create the JWKS controller
  const jwksController = new JwkController(joseJwtManager);

  // Set up Express app
  const app = express();

  // Configure JWKS endpoint
  app.get('/.well-known/jwks.json', jwksController.expressHandler);

  // Example API endpoint that requires authentication
  app.get('/api/protected', async (req, res): Promise<any> => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      // Verify the token using your session manager
      const { user } = await joseJwtManager.verifySession(token);

      res.json({
        message: 'Protected resource accessed successfully',
        user: { id: user.id, email: user.email },
      });
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  // Start the server
  const port = 3000;
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(
      `JWKS endpoint available at http://localhost:${port}/.well-known/jwks.json`
    );
  });

  return app;
}

/**
 * Example showing how to set up JoseJwtSessionManager with Hono
 */
export async function setupWithHono(db: Knex, config: AuthConfig) {
  // Configure the options for JoseJwtSessionManager
  const keyOptions: KeyStorageOptions = {
    keyDirectory: './keys',
    algorithm: 'ES256',
    rotationDays: 90,
  };

  // Create and initialize the session manager
  const joseJwtManager = new JoseJwtSessionManager(config, db, keyOptions);
  await joseJwtManager.initialize();

  // Create the JWKS controller
  const jwksController = new JwkController(joseJwtManager);

  // Set up Hono app
  const app = new Hono();

  // Configure JWKS endpoint
  app.get('/.well-known/jwks.json', jwksController.honoHandler);

  // Example API endpoint that requires authentication
  app.get('/api/protected', async (c) => {
    try {
      const authHeader = c.req.header('Authorization');
      const token = authHeader?.replace('Bearer ', '');

      if (!token) {
        return c.json({ error: 'No token provided' }, 401);
      }

      // Verify the token using your session manager
      const { user } = await joseJwtManager.verifySession(token);

      return c.json({
        message: 'Protected resource accessed successfully',
        user: { id: user.id, email: user.email },
      });
    } catch (error) {
      return c.json({ error: 'Invalid token' }, 401);
    }
  });

  return app;
}

/**
 * Example showing how an external service can verify tokens
 * without contacting the auth API
 */
export async function externalServiceExample(): Promise<any> {
  // In an external service, create a TokenVerifier
  const verifier = new TokenVerifier({
    jwksUrl: 'https://auth.yourdomain.com/.well-known/jwks.json',
    cacheTimeMs: 3600000, // Cache JWKS for 1 hour
  });

  // Function to verify a token in the external service
  async function verifyAccessToken(token: string) {
    try {
      // Verify the token using the public key from JWKS
      const { payload } = await verifier.verifyToken(token);

      // Token is valid, you can use the payload
      console.log('Token verified successfully:', payload);
      return {
        isValid: true,
        userId: payload.sub,
        email: payload.email,
      };
    } catch (error) {
      console.error('Token verification failed:', error);
      return { isValid: false };
    }
  }

  // Example usage in an API route
  const app = express();
  app.get('/external-api/resource', async (req, res): Promise<any> => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const verification = await verifyAccessToken(token);
    if (!verification.isValid) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Token is valid, proceed with the request
    res.json({
      message: 'Resource accessed successfully',
      userId: verification.userId,
    });
  });

  return app;
}
