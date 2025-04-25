import { BaseUser } from '../../../types';
import { DynamicAuthManager } from '../../../authManager';
import { AutoRouter, error, AutoRouterType, RouteEntry } from 'itty-router';
import { WebAuthConfig } from '..';
import {
  extractRefreshTokenFromRequest,
  extractTokenFromRequest,
  redirect,
  setAuthCookies,
  setCookie,
} from '../uils';
import { verifyEndpoints } from './auth/verify';
import { passwordEndpoints } from './auth/password';
import { authGuard } from './auth/middleware';
import { AuthRequest } from './auth/types';
import { InternalAdminManager } from '../../../admin/internal-admin-manager';
import { rpltEndpoints } from './auth/rplt';

export class AuthApi<TUser extends BaseUser> {
  private router: AutoRouterType<AuthRequest>;
  private authManager: DynamicAuthManager<TUser>;
  private adminManager: InternalAdminManager;
  private config: WebAuthConfig;
  private registeredRoutes: RouteEntry[];

  constructor(options: {
    authManager: DynamicAuthManager<TUser>;
    adminManager: InternalAdminManager;
    config: WebAuthConfig;
  }) {
    this.authManager = options.authManager;
    this.adminManager = options.adminManager;
    this.config = options.config;
    this.router = AutoRouter<AuthRequest>({
      base: options.config.basePath || '/auth',
    });
    this.setupRoutes();

    this.registeredRoutes = this.router.routes;

    console.log(this.registeredRoutes);
  }

  private setupRoutes() {
    this.router.post('/register', async (req: Request) => {
      try {
        const { provider, password, ...credentials } = await req.json();
        const result = await this.authManager.register(
          provider,
          credentials,
          password
        );

        if (!result.user && result.url && result.token === provider) {
          return redirect(result.url.toString());
        }

        const res = new Response(JSON.stringify(result), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });

        if (result.token) {
          setAuthCookies(res, result.token, this.config);
        }

        return res;
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    });

    this.router.post('/login', async (req: Request) => {
      try {
        const { provider, ...credentials } = await req.json();
        const result = await this.authManager.login(provider, credentials);

        if (!result.user && result.url && result.token === provider) {
          return redirect(result.url.toString());
        }

        if (!result.user && provider === 'passwordless') {
          return new Response(
            JSON.stringify({
              success: true,
              message:
                'Passwordless login initiated, check your email or sms or whatsapp for verification code',
              exp: '15m',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        const res = new Response(
          JSON.stringify({ user: result.user, token: result.token }),
          {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (result.token) {
          setAuthCookies(res, result.token, this.config);
        }

        return res;
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    });

    this.router.post('/passwordless/login/:code', async ({ params }) => {
      try {
        const code = params.code;

        if (!code) {
          return new Response(JSON.stringify({ error: 'Invalid code' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const result = await this.authManager.validateToken(
          code,
          'passwordless'
        );
        if (!result.user) {
          return new Response(JSON.stringify({ error: 'Invalid code' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const res = new Response(
          JSON.stringify({ user: result.user, token: result.token }),
          {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (result.token) {
          setAuthCookies(res, result.token, this.config);
        }

        return res;
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    });

    this.router.get('/oauth/callback', async ({ query }) => {
      try {
        const { code, state, provider } = query;
        if (!code || !state || !provider) {
          return new Response(JSON.stringify({ error: 'Invalid callback' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        const { user, token } = await this.authManager.oauthCallback(
          provider as string,
          {
            code: code as string,
            state: state as string,
          }
        );

        if (!user || !token) {
          return new Response(
            JSON.stringify({
              error: 'Failed to authenticate with OAuth provider',
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        const providerConfig = await this.authManager.getProviderConfig(
          provider as string
        );
        const redirectUrl = providerConfig.redirect_url || '/';
        const res = new Response(null, {
          status: 302,
          headers: {
            Location: redirectUrl,
          },
        });

        setAuthCookies(res, token, this.config);

        return res;
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    });

    this.router.get('/logout', async (req) => {
      try {
        const token = extractTokenFromRequest(req);
        if (!token) {
          return new Response(JSON.stringify({ error: 'UnAuthrized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        await this.authManager.logout(token);
        const res = new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
        setCookie(res, this.config.cookieName, '', {
          maxAge: 0,
        });
        try {
          setCookie(res, 'refreshToken', '', {
            maxAge: 0,
          });
        } catch (e) {
          /// console.log(e);
        }
        return res;
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    });

    this.router.post(
      '/refresh-token',
      async (req) => authGuard(req, this.authManager),
      async (req) => {
        const refreshToken = extractRefreshTokenFromRequest(req);
        if (!refreshToken) {
          return new Response(
            JSON.stringify({ error: 'Refresh token not found' }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        try {
          const token = await this.authManager.refreshToken(refreshToken);
          const res = new Response(JSON.stringify({ token }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
          setAuthCookies(res, token, this.config);
          return res;
        } catch (e) {
          return new Response(JSON.stringify({ error: e.message }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    );

    this.router.get(
      '/me',
      async (req) => authGuard(req, this.authManager),
      async ({ user }) => {
        return new Response(JSON.stringify({ user }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    );

    passwordEndpoints(this.router, this.authManager);
    verifyEndpoints(this.router, this.authManager);
    rpltEndpoints(this.router, this.authManager, this.adminManager);
  }

  getRoutes(): RouteEntry[] {
    return this.registeredRoutes;
  }

  getRouter(): AutoRouterType<AuthRequest> {
    return this.router;
  }

  async handleRequest(req: AuthRequest): Promise<Response> {
    return this.router.fetch(req);
  }
}
