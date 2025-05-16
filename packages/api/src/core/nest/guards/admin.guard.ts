import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { BaaSConfig } from '../../../types';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @Inject('FORGE_CONFIG') private config: BaaSConfig,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.get<boolean>(
      'isApiPublic',
      context.getHandler(),
    );

    const request = context.switchToHttp().getRequest() as Request;

    const adminReqName = this.config.api?.adminReqName || 'admin';

    const token = request[adminReqName];

    //TODO: Add proper way to verify the token from any auth system

    if (!token && !isPublic) {
      throw new UnauthorizedException('No admin token provided');
    }

    //TODO: Add proper way to get the isSystem flag
    if (token) {
      request['isSystem'] = true;
      request['isAdmin'] = true;
    }

    return true;
  }
}
