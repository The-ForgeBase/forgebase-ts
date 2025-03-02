import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { BaaSConfig } from '../../../types';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @Inject('FORGE_CONFIG') private config: BaaSConfig,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.get<boolean>(
      'isApiPublic',
      context.getHandler()
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest() as Request;

    if (!this.config.api.adminReqName) {
      return true;
    }

    const token = request.get(this.config.api.adminReqName || 'x-admin-token');

    if (!token) {
      throw new UnauthorizedException('No admin token provided');
    }

    return true;
  }
}
