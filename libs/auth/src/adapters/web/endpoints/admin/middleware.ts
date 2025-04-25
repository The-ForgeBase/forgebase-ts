import {
  AdminFeatureDisabledError,
  InternalAdminManager,
} from '../../../../admin';
import { AdminRequest } from './types';

export function extractAdminToken(
  req: Request,
  config: any
): {
  token: string | null;
  type: 'session' | 'apikey';
} {
  if (req.headers.get('Authorization').startsWith('AdminBearer ')) {
    return {
      token: req.headers.get('Authorization').split(' ')[1],
      type: 'session',
    };
  }

  if (req.headers.get('Cookie')) {
    const cookies = req.headers.get('Cookie')?.split('; ');
    for (const cookie of cookies || []) {
      if (cookie.startsWith(`${config.cookieName}=`)) {
        return {
          token: cookie.substring(`${config.cookieName}=`.length),
          type: 'session',
        };
      }
    }
  }

  if (req.headers.get('Authorization').startsWith('AdminApiKey ')) {
    return {
      token: req.headers.get('Authorization').split(' ')[1],
      type: 'apikey',
    };
  }

  if (req.headers['x-admin-api-key']) {
    return {
      token: req.headers['x-admin-api-key'] as string,
      type: 'apikey',
    };
  }

  return { token: null, type: 'session' };
}

export const adminGuard = async (
  req: AdminRequest,
  adminManager: InternalAdminManager
) => {
  try {
    const route = new URL(req.url).pathname;
    const { token, type } = extractAdminToken(req, {
      cookieName: 'admin_token',
    });
    if (!route.includes('/admin/login') || (!req.isPublic && !token)) {
      return new Response(
        JSON.stringify({
          status: false,
          message: 'No admin authentication provided',
        }),
        {
          status: 401,
        }
      );
    }

    const requiredScopes = req.scopes;

    if (type === 'session') {
      const { admin } = await adminManager.validateToken(token);

      req.admin = admin;
      req.isApiKeyAuth = false;
      req.adminApiKeyScopes = [];
    } else {
      const { admin, scopes } = await adminManager.validateApiKey(token);

      if (requiredScopes.length > 0) {
        const hasAllScopes = requiredScopes.every(
          (scope) => scopes.includes(scope) || scopes.includes('*')
        );

        if (!hasAllScopes) {
          return new Response(
            JSON.stringify({
              error: 'API key does not have the required scopes',
            }),
            {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }

      req.admin = admin;
      req.isApiKeyAuth = true;
      req.adminApiKeyScopes = scopes;
    }
  } catch (error) {
    if (error instanceof AdminFeatureDisabledError) {
      return new Response(
        JSON.stringify({ error: 'Admin feature is disabled' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const adminAddScopes = (req: AdminRequest, scopes: string[]) => {
  req.scopes = scopes;
};
