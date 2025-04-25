import { BaseUser } from '../../../../types';
import { DynamicAuthManager } from '../../../../authManager';
import {
  extractRefreshTokenFromRequest,
  extractTokenFromRequest,
  setAuthCookies,
} from '../../uils';
import { AuthRequest } from './types';
import { UserContext } from '@forgebase-ts/database';
import { error } from 'itty-router';
import { WebAuthConfig } from '../..';

export const userContextMiddleware = async <TUser extends BaseUser = any>(
  req: AuthRequest | any,
  authManager: DynamicAuthManager<TUser>
) => {
  try {
    const token = extractTokenFromRequest(req);
    if (token) {
      const { user, token: newToken } = await authManager.validateToken(
        token as string,
        'local'
      );
      const labels: string[] =
        typeof user.labels === 'string'
          ? user.labels.split(',')
          : Array.isArray(user.labels)
          ? user.labels
          : [];
      const teams: string[] =
        typeof user.teams === 'string'
          ? user.teams.split(',')
          : Array.isArray(user.teams)
          ? user.teams
          : [];
      const permissions: string[] =
        typeof user.permissions === 'string'
          ? user.permissions.split(',')
          : Array.isArray(user.permissions)
          ? user.permissions
          : [];

      const userContext: UserContext = {
        userId: user.id,
        role: user.role || '',
        labels,
        teams,
        permissions,
      };

      req.user = user;
      req.userContext = userContext;
      if (newToken) {
        req.newToken = newToken;
      } else {
        req.token = token;
      }
    }
  } catch (e) {
    return error(401, e.message);
  }
};

export const attachNewToken = async (
  req: AuthRequest | any,
  res: Response,
  config: WebAuthConfig
) => {
  if (req.newToken) {
    setAuthCookies(res, req.newToken, config);
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
      return error(401, 'Unauthorized');
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
      return error(401, 'MFA required');
    }
  } catch (e) {
    return error(401, e.message);
  }
};
