import { BaseUser } from '../../../../types';
import { DynamicAuthManager } from '../../../../authManager';
import {
  extractRefreshTokenFromRequest,
  extractTokenFromRequest,
} from '../../uils';
import { AuthRequest } from './types';

export const userContextMiddleware = async <TUser extends BaseUser = any>(
  req: AuthRequest,
  authManager: DynamicAuthManager<TUser>
) => {
  try {
    const token = extractTokenFromRequest(req);
    const refreshToken = extractRefreshTokenFromRequest(req);
    if (!token && !refreshToken) {
      return new Response(JSON.stringify({ error: 'UnAuthrized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { user, token: newToken } = await authManager.validateToken(
      token as string,
      'local'
    );

    req.user = user;
    if (newToken) {
      req.newToken = newToken;
    } else {
      req.token = token;
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const authGuard = async <TUser extends BaseUser = any>(
  req: AuthRequest,
  authManager: DynamicAuthManager<TUser>
) => {
  try {
    const token = req.token || req.newToken;
    const user = req.user;
    if (!token || !user) {
      return new Response(JSON.stringify({ error: 'UnAuthrized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const config = authManager.getConfig();
    const mfaStatus = authManager.getMfaStatus();
    const route = new URL(req.url).pathname;

    if (
      config.mfaSettings.required &&
      mfaStatus &&
      !user.mfa_enabled &&
      !route.includes('mfa')
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'MFA is required',
          mfa_status: mfaStatus,
          mfa_required: true,
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
