import { Context, MiddlewareHandler } from 'hono';
import { ForgeApiService } from '../forge-api.service';
import { HTTPException } from 'hono/http-exception';
import { UserContext } from '@forgebase-ts/database';
import { Variables } from '../forge-api.handler';

export function authMiddleware(
  forgeApiService: ForgeApiService,
  excludePaths: string[] = []
): MiddlewareHandler<{ Variables: Variables }> {
  return async (c: Context<{ Variables: Variables }>, next) => {
    const path = c.req.path;

    // Skip auth for excluded paths
    if (excludePaths.some((excludePath) => path.startsWith(excludePath))) {
      await next();
      return;
    }

    // Get user context from header
    const userContextHeader = c.req.header('user-context');
    if (!userContextHeader) {
      throw new HTTPException(401, { message: 'Authentication required' });
    }

    try {
      // Parse user context
      const userContext = JSON.parse(userContextHeader) as UserContext;

      // Set user context in the context
      c.set('userContext', userContext);

      // Check if the request is a system request
      const isSystem = c.req.header('x-system-request') === 'true';
      c.set('isSystem', isSystem);

      await next();
    } catch (error) {
      console.error('Error parsing user context:', error);
      throw new HTTPException(401, { message: 'Invalid user context' });
    }
  };
}
