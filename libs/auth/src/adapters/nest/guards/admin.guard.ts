import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { AdminFeatureDisabledError } from '../../../types/admin';
import { AdminService } from '../services/admin.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private adminService: AdminService,
    private reflector: Reflector
  ) {}

  private extractToken(request: Request): string | null {
    if (request.headers.authorization?.startsWith('AdminBearer ')) {
      return request.headers.authorization.substring(12);
    }
    // console.log('AdminGuard request.cookies:', request.cookies);
    console.log('AdminGuard request.headers:', request.headers);

    if (request.cookies && request.cookies.admin_token) {
      return request.cookies.admin_token;
    }

    return null;
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

    console.log('AdminGuard path:', path);

    // Skip token validation for login endpoint
    if (path.endsWith('/admin/login')) {
      return true;
    }

    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('No admin token provided');
    }

    try {
      const { admin } = await this.adminService.validateToken(token);

      // Add the admin to the request object for use in controllers
      request['admin'] = admin;
      return true;
    } catch (error) {
      // console.log('AdminGuard error:', error);
      if (error instanceof AdminFeatureDisabledError) {
        throw new UnauthorizedException('Admin feature is disabled');
      }
      throw new UnauthorizedException('Invalid admin token');
    }
  }
}
