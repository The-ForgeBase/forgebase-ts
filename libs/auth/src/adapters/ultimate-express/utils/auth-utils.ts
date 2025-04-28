import { DynamicAuthManager } from '../../../authManager';
import { InternalAdminManager } from '../../../admin';
import { extractTokenFromRequest } from '../uils';
import { extractAdminToken } from '../endpoints/auth/middleware';
import { UserContext } from '@forgebase-ts/database';
import { AuthRequest } from '../endpoints/auth/types';
import { User, AuthToken } from '../../../types';
import { InternalAdmin } from '../../../types/admin';
import { WebAuthConfig } from '..';

/**
 * Session data returned by processAuthTokens
 */
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

/**
 * Process authentication tokens (both user and admin) and return session data
 * This is used by both getSession and userContextMiddleware
 */
export async function processAuthTokens(
  req: Request,
  authManager: DynamicAuthManager,
  config: WebAuthConfig,
  adminManager?: InternalAdminManager
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
    } catch (e) {
      console.error('Error validating admin token:', e.message);
      // Continue to user token validation if admin token validation fails
    }
  }

  // Process user token if present
  if (userToken) {
    try {
      const { user, token: newToken } = await authManager.validateToken(
        userToken,
        'local'
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
    } catch (e) {
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
  req: AuthRequest,
  session: SessionData
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
