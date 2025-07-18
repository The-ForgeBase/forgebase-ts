import { Request, Response, NextFunction } from 'express';
import {
  applySessionToRequest,
  processAuthTokens,
  setAuthCookies,
} from './utils';
import { DynamicAuthManager } from '../../authManager';
import { ExpressAuthConfig, ExpressAuthRequest } from './types';
import { InternalAdminManager } from '../../admin/internal-admin-manager';

export async function userContextMiddleware(
  req: ExpressAuthRequest,
  res: Response,
  next: NextFunction,
  authManager: DynamicAuthManager,
  config: ExpressAuthConfig,
  adminManager?: InternalAdminManager,
) {
  try {
    const sessionData = await processAuthTokens(
      req,
      authManager,
      config,
      adminManager,
    );

    if (sessionData) {
      applySessionToRequest(req, sessionData);
    }

    next();
  } catch (error) {
    next(error);
  }
}

export function attachNewToken(
  req: ExpressAuthRequest,
  res: Response,
  next: NextFunction,
  config: ExpressAuthConfig,
) {
  if (req.newToken) {
    setAuthCookies(res, req.newToken, config);
  }
  next();
}

export function authGuard(
  req: ExpressAuthRequest,
  res: Response,
  next: NextFunction,
): any {
  if (req.isAdmin && req.admin) {
    return next();
  }
  if (!req.token || !req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

export function extractAdminToken(req: Request): {
  token: string | null;
  type: 'session' | 'apikey';
} {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('AdminBearer ')
  ) {
    return {
      token: req.headers.authorization.split(' ')[1] || null,
      type: 'session',
    };
  }

  if (req.cookies && req.cookies['admin_token']) {
    return {
      token: req.cookies['admin_token'] || null,
      type: 'session',
    };
  }

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('AdminApiKey ')
  ) {
    return {
      token: req.headers.authorization.split(' ')[1] || null,
      type: 'apikey',
    };
  }

  if (req.headers['x-admin-api-key']) {
    return {
      token: (req.headers['x-admin-api-key'] as string) || null,
      type: 'apikey',
    };
  }

  return { token: null, type: 'session' };
}
