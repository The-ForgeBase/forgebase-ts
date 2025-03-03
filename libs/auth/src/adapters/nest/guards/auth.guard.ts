import { DynamicAuthManager } from '../../../authManager';
import { MFARequiredError, User } from '../../../types';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';

@Injectable()
export class AuthGuard<TUser extends User> implements CanActivate {
  constructor(
    @Inject('AUTH_MANAGER') private authManager: DynamicAuthManager<TUser>,
    private reflector: Reflector
  ) {}

  private extractToken(request: Request): string | null {
    if (request.headers.authorization?.startsWith('Bearer ')) {
      return request.headers.authorization.substring(7);
    }

    if (request.cookies && request.cookies.token) {
      return request.cookies.token;
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
    const res = context.switchToHttp().getResponse() as Response;
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const { user, token: newToken } = await this.authManager.validateToken(
        token,
        'local'
      );

      if (newToken) {
        if (typeof newToken === 'object' && newToken !== null) {
          res.cookie('token', newToken.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
          });
          res.cookie('refreshToken', newToken.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
          });
        } else {
          res.cookie('token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
          });
        }
      }

      const config = this.authManager.getConfig();
      const mfaStatus = this.authManager.getMfaStatus();

      if (
        config.mfaSettings.required &&
        mfaStatus &&
        !user.mfa_enabled &&
        !request.path.includes('mfa')
      ) {
        throw new MFARequiredError();
      }

      request['user'] = user;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
