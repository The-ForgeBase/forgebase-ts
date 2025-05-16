// Express-specific utility functions for auth
import { Request, Response } from 'express';
import { AuthToken, User } from '../../types';
import { ExpressAuthConfig, ExpressAuthRequest } from './types';
import { DynamicAuthManager } from '../../authManager';
import { InternalAdminManager } from '../../admin/internal-admin-manager';
import { InternalAdmin } from '../../types/admin';
import { UserContext } from '@the-forgebase/common';
import { extractAdminToken } from './middleware';

export interface SessionData {
  userContext?: UserContext;
  user?: User;
  token?: string | AuthToken;
  newToken?: string | AuthToken;
  isAdmin: boolean;
  isSystem: boolean;
  isApiKeyAuth: boolean;
  adminApiKeyScopes: string[];
  admin?: InternalAdmin;
}

export function extractTokenFromRequest(
  req: Request,
  config: ExpressAuthConfig,
): string | null {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    return req.headers.authorization.split(' ')[1] || null;
  }
  if (req.cookies && req.cookies[config.cookieName!]) {
    return req.cookies[config.cookieName!] || null;
  }
  if (req.headers[config.cookieName!]) {
    return (req.headers[config.cookieName!] as string) || null;
  }
  return null;
}

export function extractRefreshTokenFromRequest(req: Request): string | null {
  if (req.headers['x-refresh-token']) {
    return (req.headers['x-refresh-token'] as string) || null;
  }
  if (req.cookies && req.cookies['refreshToken']) {
    return req.cookies['refreshToken'] || null;
  }
  return null;
}

export function setCookie(
  res: Response,
  name: string,
  value: string,
  options: any,
) {
  res.cookie(name, value, options);
}

export function redirect(res: Response, url: string) {
  res.redirect(url);
}

export function setAuthCookies(
  res: Response,
  token: string | AuthToken,
  config: ExpressAuthConfig,
) {
  if (typeof token === 'object' && token !== null) {
    setCookie(res, config.cookieName!, token.accessToken, {
      httpOnly: config.cookieOptions!.httpOnly || false,
      secure: config.cookieOptions!.secure || false,
      maxAge: config.cookieOptions!.maxAge || 3600000, // 7 days
      sameSite: config.cookieOptions!.sameSite || 'strict',
      path: config.cookieOptions!.path || '/',
    });
    setCookie(res, 'refreshToken', token.refreshToken, {
      httpOnly: config.cookieOptions!.httpOnly || false,
      secure: config.cookieOptions!.secure || false,
      maxAge: config.cookieOptions!.maxAge! * 2 || 3600000 * 2, // 7 days
      sameSite: config.cookieOptions!.sameSite || 'strict',
      path: config.cookieOptions!.path || '/',
    });
  } else {
    setCookie(res, config.cookieName!, token as string, {
      httpOnly: config.cookieOptions!.httpOnly || false,
      secure: config.cookieOptions!.secure || false,
      maxAge: config.cookieOptions!.maxAge || 3600000, // 7 days
      sameSite: config.cookieOptions!.sameSite || 'strict',
      path: config.cookieOptions!.path || '/',
    });
  }
}

export function isPublic(req: Request) {
  (req as any).isPublic = true;
}

/**
 * Process authentication tokens (both user and admin) and return session data
 * This is used by both getSession and userContextMiddleware
 */
export async function processAuthTokens(
  req: Request,
  authManager: DynamicAuthManager,
  config: ExpressAuthConfig,
  adminManager?: InternalAdminManager,
): Promise<SessionData | null> {
  // Extract tokens
  const userToken = extractTokenFromRequest(req, config);
  const { token: adminToken, type: adminTokenType } = extractAdminToken(req);

  // If no tokens found, return null
  if (!userToken && !adminToken) {
    return null;
  }

  // Initialize session data
  const sessionData: SessionData = {
    isAdmin: false,
    isSystem: false,
    isApiKeyAuth: false,
    adminApiKeyScopes: [],
  };

  // Process admin token if present
  if (adminToken && adminManager) {
    try {
      if (adminTokenType === 'session') {
        // Validate admin session token
        const { admin } = await adminManager.validateToken(adminToken);
        sessionData.admin = admin;
        sessionData.isApiKeyAuth = false;
        sessionData.isAdmin = true;
        sessionData.isSystem = true;
      } else {
        // Validate admin API key
        const { admin, scopes } = await adminManager.validateApiKey(adminToken);
        sessionData.admin = admin;
        sessionData.isApiKeyAuth = true;
        sessionData.adminApiKeyScopes = scopes;
        sessionData.isAdmin = true;
        sessionData.isSystem = true;
      }

      // If admin token is valid, return admin session data
      if (sessionData.admin) {
        return sessionData;
      }
    } catch (e: any) {
      console.error('Error validating admin token:', e.message);
      // Continue to user token validation if admin token validation fails
    }
  }

  // Process user token if present
  if (userToken) {
    try {
      const { user, token: newToken } = await authManager.validateToken(
        userToken,
        'local',
      );

      // Process user data
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

      // Create user context
      const userContext: UserContext = {
        userId: user.id,
        role: user.role || '',
        labels,
        teams,
        permissions,
      };

      // Update session data with user information
      sessionData.user = user;
      sessionData.userContext = userContext;
      sessionData.token = userToken;
      sessionData.newToken = newToken;

      return sessionData;
    } catch (e: any) {
      console.error('Error validating user token:', e.message);
      // Return null if user token validation fails and no admin token was valid
      return null;
    }
  }

  // If we get here, neither token was valid
  return null;
}

/**
 * Apply session data to a request object
 */
export function applySessionToRequest(
  req: ExpressAuthRequest,
  session: SessionData,
): void {
  if (!session) return;

  // Apply admin data if present
  if (session.isAdmin && session.admin) {
    req.admin = session.admin;
    req.isAdmin = true;
    req.isSystem = session.isSystem;
    req.isApiKeyAuth = session.isApiKeyAuth;
    req.adminApiKeyScopes = session.adminApiKeyScopes;
  }

  // Apply user data if present
  if (session.user) {
    req.user = session.user;
    req.userContext = session.userContext;

    if (session.newToken) {
      req.newToken = session.newToken;
    } else if (session.token) {
      req.token = session.token;
    }
  }
}
