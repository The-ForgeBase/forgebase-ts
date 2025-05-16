import { MFARequiredError } from '../../../types';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { type NestAuthConfig } from '..';
import { type AwilixContainer } from 'awilix';
import { AuthCradle } from '../../../container';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject('AUTH_CONTAINER') private container: AwilixContainer<AuthCradle>,
    @Inject('AUTH_CONFIG') private adminConfig: NestAuthConfig,
    private reflector: Reflector,
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
      context.getHandler(),
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
      const { user, token: newToken } =
        await this.container.cradle.authManager.validateToken(token, 'local');

      if (newToken) {
        if (typeof newToken === 'object' && newToken !== null) {
          res.cookie('token', newToken.accessToken, {
            httpOnly: this.adminConfig.cookieOptions?.httpOnly || true,
            maxAge: this.adminConfig.cookieOptions?.maxAge || 3600,
            sameSite: this.adminConfig.cookieOptions?.sameSite || 'lax',
            secure: process.env.NODE_ENV === 'production',
          });
          res.cookie('refreshToken', newToken.refreshToken, {
            httpOnly: this.adminConfig.cookieOptions?.httpOnly || true,
            maxAge: this.adminConfig.cookieOptions?.maxAge || 3600,
            sameSite: this.adminConfig.cookieOptions?.sameSite || 'lax',
            secure: process.env.NODE_ENV === 'production',
          });
        } else {
          res.cookie('token', newToken, {
            httpOnly: this.adminConfig.cookieOptions?.httpOnly || true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: this.adminConfig.cookieOptions?.maxAge || 3600,
            sameSite: this.adminConfig.cookieOptions?.sameSite || 'lax',
          });
        }
      }

      const config = this.container.cradle.authManager.getConfig();
      const mfaStatus = this.container.cradle.authManager.getMfaStatus();

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
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
