import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { AuthConfigService } from '../auth.config.service';

@Injectable()
export class AuthInterceptor implements NestInterceptor {
  constructor(private authConfigService: AuthConfigService) {}

  private extractToken(request: Request): string | null {
    // Try to extract token from Authorization header
    if (request.headers.authorization?.startsWith('Bearer ')) {
      return request.headers.authorization.substring(7);
    }

    // Try to extract token from cookies
    if (request.cookies) {
      // Check for auth_token (the name used in the auth module)
      if (request.cookies.auth_token) {
        return request.cookies.auth_token;
      }

      // Also check for token (generic name)
      if (request.cookies.token) {
        return request.cookies.token;
      }
    }

    return null;
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    console.debug('AuthInterceptor: intercepting request:', request.url);

    const token = this.extractToken(request);

    if (token) {
      try {
        // Get the auth manager from the config service
        const authManager = this.authConfigService.getAuthManager();
        if (!authManager) {
          console.error('Auth manager not available');
          return next.handle();
        }

        // Validate the token
        const { user, token: newToken } = await authManager.validateToken(
          token,
          'local'
        );

        // Attach the user to the request
        request['user'] = user;

        console.debug('AuthInterceptor: user:', user);

        // Create a UserContext object for RLS
        let labels: string[] = [];
        if (user.labels) {
          labels =
            typeof user.labels === 'string'
              ? user.labels.split(',')
              : Array.isArray(user.labels)
              ? user.labels
              : [];
        }

        let teams: string[] = [];
        if (user.teams) {
          teams =
            typeof user.teams === 'string'
              ? user.teams.split(',')
              : Array.isArray(user.teams)
              ? user.teams
              : [];
        }

        let permissions: string[] = [];
        if (user.permissions) {
          permissions =
            typeof user.permissions === 'string'
              ? user.permissions.split(',')
              : Array.isArray(user.permissions)
              ? user.permissions
              : [];
        }

        // Create the userContext object for RLS
        const userContext = {
          userId: user.id,
          labels,
          teams,
          permissions,
          role: user.role || '',
        };

        // Attach the userContext to the request
        request['userContext'] = userContext;

        // Update token if needed
        if (newToken) {
          if (typeof newToken === 'object' && newToken !== null) {
            response.cookie('auth_token', newToken.accessToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              maxAge: 3600 * 1000, // 1 hour
              sameSite: 'lax',
            });

            if (newToken.refreshToken) {
              response.cookie('refresh_token', newToken.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 3600 * 1000, // 7 days
                sameSite: 'lax',
              });
            }
          } else {
            response.cookie('auth_token', newToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              maxAge: 3600 * 1000, // 1 hour
              sameSite: 'lax',
            });
          }
        }
      } catch (error) {
        // If token validation fails, continue without setting user
        console.debug('Token validation failed:', error.message);
      }
    }

    // Always continue with the request, even if authentication fails
    // This makes it an interceptor rather than a guard
    return next.handle();
  }
}
