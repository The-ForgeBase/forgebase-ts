import { DynamicAuthManager } from '../../../../authManager';
import { setAuthCookies } from '../../uils';
import { AuthRequest } from './types';
import { error } from 'itty-router';
import { WebAuthConfig } from '../..';
import { InternalAdminManager } from '../../../../admin';
import {
  processAuthTokens,
  applySessionToRequest,
} from '../../utils/auth-utils';

/**
 * Extract admin token from request
 */
export function extractAdminToken(req: Request): {
  token: string | null;
  type: 'session' | 'apikey';
} {
  // Check for AdminBearer in Authorization header
  if (req.headers.get('Authorization')?.startsWith('AdminBearer ')) {
    return {
      token: req.headers.get('Authorization')?.split(' ')[1] || null,
      type: 'session',
    };
  }

  // Check for admin token in cookies
  if (req.headers.get('Cookie')) {
    const cookies = req.headers.get('Cookie')?.split('; ');
    for (const cookie of cookies || []) {
      if (cookie.startsWith(`admin_token=`)) {
        return {
          token: cookie.substring(`admin_token=`.length),
          type: 'session',
        };
      }
    }
  }

  // Check for AdminApiKey in Authorization header
  if (req.headers.get('Authorization')?.startsWith('AdminApiKey ')) {
    return {
      token: req.headers.get('Authorization')?.split(' ')[1] || null,
      type: 'apikey',
    };
  }

  // Check for X-Admin-API-Key header
  if (req.headers.get('X-Admin-API-Key')) {
    return {
      token: req.headers.get('X-Admin-API-Key') || null,
      type: 'apikey',
    };
  }

  return { token: null, type: 'session' };
}

/**
 * Middleware to attach user and admin context to the request
 */
export const userContextMiddleware = async (
  req: AuthRequest,
  authManager: DynamicAuthManager,
  config: WebAuthConfig,
  adminManager?: InternalAdminManager,
) => {
  try {
    // Use the shared utility function to process tokens
    const sessionData = await processAuthTokens(
      req,
      authManager,
      config,
      adminManager,
    );

    // Apply session data to the request
    if (sessionData) {
      applySessionToRequest(req, sessionData);
    }
  } catch (e: any) {
    return error(401, e.message);
  }
};

export const attachNewToken = async (
  req: AuthRequest,
  res: Response,
  config: WebAuthConfig,
) => {
  if (req.newToken) {
    setAuthCookies(res, req.newToken, config);
  }

  return res;
};

export const authGuard = async (
  req: AuthRequest,
  authManager: DynamicAuthManager,
) => {
  try {
    // Check if user is an admin - admins can bypass regular auth checks
    if (req.isAdmin && req.admin) {
      return; // Admin is authenticated, allow access
    }

    // Regular user authentication check
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
  } catch (e: any) {
    return error(401, e.message);
  }
};
