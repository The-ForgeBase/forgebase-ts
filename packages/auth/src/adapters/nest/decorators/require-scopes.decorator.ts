import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to specify required API key scopes for a route
 * @param scopes The scopes required to access the route
 */
export const RequireScopes = (...scopes: string[]) => SetMetadata('requiredScopes', scopes);
