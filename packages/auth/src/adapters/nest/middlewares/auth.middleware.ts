import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { type AwilixContainer } from 'awilix';
import { AuthCradle } from '../../../container';
import { User } from '../../../types';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    @Inject('AUTH_CONTAINER') private container: AwilixContainer<AuthCradle>,
  ) {}

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

  async use(request: Request, response: Response, next: NextFunction) {
    try {
      if (request['user'] && request['userContext']) {
        return next();
      }

      const token = this.extractToken(request);

      if (token) {
        try {
          const { user, token: newToken } =
            await this.container.cradle.authManager.validateToken(
              token,
              'local',
            );

          if (user) {
            request['user'] = user;
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
          }
        } catch (error) {
          // Don't throw error here, just don't inject admin
          // This allows the request to continue for public routes
          console.error('Error validating token:', error);
          request['user'] = undefined;
          request['userContext'] = undefined;
        }
      } else {
        request['user'] = undefined;
        request['userContext'] = undefined;
      }

      next();
    } catch (error) {
      // If any unexpected error occurs, log it but don't block the request
      console.error('Error in AuthMiddleware:', error);
      request['user'] = undefined;
      request['userContext'] = undefined;
      next();
    }
  }
}
