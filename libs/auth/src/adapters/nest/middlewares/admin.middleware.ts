import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';

@Injectable()
export class AdminMiddleware implements NestMiddleware {
  constructor(private readonly adminService: AdminService) {}

  private extractToken(request: Request): string | null {
    if (request.headers.authorization?.startsWith('AdminBearer ')) {
      return request.headers.authorization.substring(12);
    }

    if (request.cookies && request.cookies.admin_token) {
      return request.cookies.admin_token;
    }

    return null;
  }

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const token = this.extractToken(req);

      if (token) {
        try {
          const { admin } = await this.adminService.validateToken(token);
          // Inject admin info into request object if validation succeeds
          req['admin'] = admin;
        } catch (error) {
          // Don't throw error here, just don't inject admin
          // This allows the request to continue for public routes
          console.debug('Admin token validation failed:', error.message);
          req['admin'] = null;
        }
      } else {
        req['admin'] = null;
      }

      //   console.debug('Admin info injected:', req['admin']);
      //   console.debug('Request', {
      //     headers: req.headers,
      //     cookies: req.cookies,
      //     body: req.body,
      //     params: req.params,
      //     query: req.query,
      //     method: req.method,
      //   });

      next();
    } catch (error) {
      // If any unexpected error occurs, log it but don't block the request
      console.error('Error in AdminMiddleware:', error);
      req['admin'] = null;
      next();
    }
  }
}
