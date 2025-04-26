import { Context, MiddlewareHandler } from 'hono';
import { ForgeApiService } from '../forge-api.service';
import { FgAPiVariables } from '../forge-api.handler';

export function adminMiddleware(
  forgeApiService: ForgeApiService
): MiddlewareHandler<{ Variables: FgAPiVariables }> {
  return async (c: Context<{ Variables: FgAPiVariables }>, next) => {
    const config = forgeApiService.getConfig();
    const adminReqName = config.api?.adminReqName || 'admin';

    // Check if the request has the admin flag
    const isAdmin = c.req.header(adminReqName) === 'true';

    // Set the isAdmin flag in the context
    c.set('isAdmin', isAdmin);

    await next();
  };
}
