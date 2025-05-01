import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AdminFeatureDisabledError } from '../../../types/admin';
import { AwilixContainer } from 'awilix';
import { AuthCradle } from '../../../container';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @Inject('AUTH_CONTAINER') private container: AwilixContainer<AuthCradle>,
    private reflector: Reflector
  ) {}

  private extractToken(request: Request): {
    token: string | null;
    type: 'session' | 'apikey';
  } {
    // Check for session token
    if (request.headers.authorization?.startsWith('AdminBearer ')) {
      return {
        token: request.headers.authorization.substring(12),
        type: 'session',
      };
    }

    if (request.cookies && request.cookies.admin_token) {
      return { token: request.cookies.admin_token, type: 'session' };
    }

    // Check for API key
    if (request.headers.authorization?.startsWith('AdminApiKey ')) {
      return {
        token: request.headers.authorization.substring(12),
        type: 'apikey',
      };
    }

    // Check X-Admin-API-Key header
    if (request.headers['x-admin-api-key']) {
      return {
        token: request.headers['x-admin-api-key'] as string,
        type: 'apikey',
      };
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('AdminGuard request.headers:', request.headers);
    }

    return { token: null, type: 'session' };
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler()
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest() as Request;
    const path = request.path;

    if (process.env.NODE_ENV !== 'production') {
      console.log('AdminGuard path:', path);
    }

    // Skip token validation for login endpoint
    if (path.endsWith('/admin/login')) {
      return true;
    }

    const { token, type } = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('No admin authentication provided');
    }

    try {
      // Get required scopes from metadata if using API key
      const requiredScopes =
        this.reflector.get<string[]>('requiredScopes', context.getHandler()) ||
        [];

      if (type === 'session') {
        // Validate session token
        const { admin } = await this.container.cradle.adminManager.validateToken(token);

        // Add the admin to the request object for use in controllers
        request['admin'] = admin;
        request['isApiKeyAuth'] = false;
        request['adminApiKeyScopes'] = [];
        return true;
      } else {
        // Validate API key
        const { admin, scopes } = await this.container.cradle.adminManager.validateApiKey(token);

        // Check if the API key has the required scopes
        if (requiredScopes.length > 0) {
          const hasAllScopes = requiredScopes.every(
            (scope) => scopes.includes(scope) || scopes.includes('*')
          );

          if (!hasAllScopes) {
            throw new UnauthorizedException(
              'API key does not have the required scopes'
            );
          }
        }

        // Add the admin and scopes to the request object for use in controllers
        request['admin'] = admin;
        request['isApiKeyAuth'] = true;
        request['adminApiKeyScopes'] = scopes;
        return true;
      }
    } catch (error) {
      console.error('AdminGuard error:', error);
      if (error instanceof AdminFeatureDisabledError) {
        throw new UnauthorizedException('Admin feature is disabled');
      }
      throw new UnauthorizedException(
        type === 'session' ? 'Invalid admin token' : 'Invalid admin API key'
      );
    }
  }
}
