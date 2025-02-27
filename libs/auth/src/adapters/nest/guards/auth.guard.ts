import { DynamicAuthManager, MFARequiredError, User } from '@forgebase-ts/auth';
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AuthGuard<TUser extends User> implements CanActivate {
  constructor(
    private authManager: DynamicAuthManager<TUser>,
    private reflector: Reflector
  ) {}

  private extractToken(request: any): string | null {
    if (request.headers.authorization?.startsWith('Bearer ')) {
      return request.headers.authorization.substring(7);
    }

    if (request.cookies && request.cookies.token) {
      return request.cookies.token;
    }
    return null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const user = await this.authManager.validateToken(token, 'local');
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