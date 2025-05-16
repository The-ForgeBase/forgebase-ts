import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';

@Injectable()
export class AdminMiddleware implements NestMiddleware {
  constructor(private readonly adminService: AdminService) {}

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

    // Check query parameter
    if (request.query.admin_api_key) {
      return { token: request.query.admin_api_key as string, type: 'apikey' };
    }

    return { token: null, type: 'session' };
  }

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, type } = this.extractToken(req);

      if (token) {
        try {
          if (type === 'session') {
            // Validate session token
            const { admin } = await this.adminService.validateToken(token);
            // Inject admin info into request object if validation succeeds
            req['admin'] = admin;
            req['isApiKeyAuth'] = false;
            req['adminApiKeyScopes'] = [];
          } else {
            // Validate API key
            const { admin, scopes } =
              await this.adminService.validateApiKey(token);
            // Inject admin info and scopes into request object
            req['admin'] = admin;
            req['isApiKeyAuth'] = true;
            req['adminApiKeyScopes'] = scopes;
          }
        } catch (error: any) {
          // Don't throw error here, just don't inject admin
          // This allows the request to continue for public routes
          console.debug(`Admin ${type} validation failed:`, error.message);
          req['admin'] = null;
          req['isApiKeyAuth'] = false;
          req['adminApiKeyScopes'] = [];
        }
      } else {
        req['admin'] = null;
        req['isApiKeyAuth'] = false;
        req['adminApiKeyScopes'] = [];
      }

      // For debugging
      console.debug('Admin info injected:', {
        admin: req['admin'],
        isApiKeyAuth: req['isApiKeyAuth'],
        scopes: req['adminApiKeyScopes'],
      });

      next();
    } catch (error) {
      // If any unexpected error occurs, log it but don't block the request
      console.error('Error in AdminMiddleware:', error);
      req['admin'] = null;
      req['isApiKeyAuth'] = false;
      req['adminApiKeyScopes'] = [];
      next();
    }
  }
}
