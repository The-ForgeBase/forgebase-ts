import { DynamicAuthManager } from '../../../authManager';
import {
  AutoRouter,
  error,
  AutoRouterType,
  RouteEntry,
  RequestHandler,
  ResponseHandler,
  CorsOptions,
  cors,
  json,
} from 'itty-router';
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
import {
  authGuard,
  attachNewToken,
  userContextMiddleware,
} from './auth/middleware';
import { AuthRequest } from './auth/types';
import { InternalAdminManager } from '../../../admin/internal-admin-manager';
import { rpltEndpoints } from './auth/rplt';
import {
  processAuthTokens,
  SessionData,
  applySessionToRequest,
} from '../utils/auth-utils';

export class AuthApi {
  private router: AutoRouterType<AuthRequest>;
  authManager: DynamicAuthManager;
  adminManager: InternalAdminManager;
  config: WebAuthConfig;
  private registeredRoutes: RouteEntry[];

  constructor(options: {
    authManager: DynamicAuthManager;
    adminManager: InternalAdminManager;
    config: WebAuthConfig;
    beforeMiddlewares?: RequestHandler[];
    finallyMiddlewares?: ResponseHandler[];
    cors: {
      enabled: boolean;
      corsOptions?: CorsOptions;
    };
  }) {
    const { preflight, corsify } = cors(options.cors.corsOptions);

    const beforeMiddlewares = options.beforeMiddlewares || [];
    const finallyMiddlewares = options.finallyMiddlewares || [];

    this.authManager = options.authManager;
    this.adminManager = options.adminManager;
    this.config = options.config;
    this.router = AutoRouter<AuthRequest>({
      base: options.config.basePath || '/auth',
      // before: [
      //   options.cors?.enabled ? preflight : undefined,
      //   ...beforeMiddlewares,
      //   userContextMiddleware.bind(this, this.authManager, this.adminManager),
      // ],
      // finally: [
      //   options.cors?.enabled ? corsify : undefined,
      //   ...finallyMiddlewares,
      //   attachNewToken.bind(this, this.config),
      // ],
    });
    this.setupRoutes();

    this.registeredRoutes = this.router.routes;

    console.log(this.registeredRoutes.map((r) => r[3]));

    console.log('Auth API initialized');
  }

  private setupRoutes() {
    this.router.post('/register', async (req: AuthRequest) => {
      try {
        const { provider, password, ...credentials } = await req.json();
        const result = await this.authManager.register(
          provider,
          credentials,
          password,
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
      } catch (e: any) {
        return error(400, e.message);
      }
    });

    this.router.post('/login', async (req: AuthRequest) => {
      try {
        const { provider, ...credentials } = await req.json();
        const result = await this.authManager.login(provider, credentials);

        if (!result.user && result.url && result.token === provider) {
          return redirect(result.url.toString());
        }

        if (!result.user && provider === 'passwordless') {
          return json(
            {
              success: true,
              message:
                'Passwordless login initiated, check your email or sms or whatsapp for verification code',
              exp: '15m',
            },
            { status: 200 },
          );
        }

        const res = json(
          { user: result.user, token: result.token },
          {
            status: 201,
          },
        );

        if (result.token) {
          setAuthCookies(res, result.token, this.config);
        }

        return res;
      } catch (e: any) {
        return error(400, e.message);
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
          'passwordless',
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
          },
        );

        if (result.token) {
          setAuthCookies(res, result.token, this.config);
        }

        return res;
      } catch (e: any) {
        return error(400, e.message);
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
          },
        );

        if (!user || !token) {
          return new Response(
            JSON.stringify({
              error: 'Failed to authenticate with OAuth provider',
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            },
          );
        }

        const providerConfig = await this.authManager.getProviderConfig(
          provider as string,
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
      } catch (e: any) {
        return error(400, e.message);
      }
    });

    this.router.get('/logout', async (req) => {
      try {
        const token = extractTokenFromRequest(req, this.config);
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
        setCookie(res, this.config.cookieName!, '', {
          maxAge: 0,
        });
        try {
          setCookie(res, 'refreshToken', '', {
            maxAge: 0,
          });
        } catch (error: any) {
          // Ignore error when clearing refresh token
          console.debug('Error clearing refresh token:', error.message);
        }
        return res;
      } catch (e: any) {
        return error(400, e.message);
      }
    });

    this.router.post(
      '/refresh-token',
      async (req) => authGuard(req, this.authManager),
      async (req) => {
        try {
          const refreshToken = extractRefreshTokenFromRequest(req);
          if (!refreshToken) {
            return new Response(
              JSON.stringify({ error: 'Refresh token not found' }),
              {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
              },
            );
          }
          const token = await this.authManager.refreshToken(refreshToken);
          const res = new Response(JSON.stringify({ token }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
          setAuthCookies(res, token, this.config);
          return res;
        } catch (e: any) {
          return error(400, e.message);
        }
      },
    );

    this.router.get(
      '/me',
      async (req) => authGuard(req, this.authManager),
      async ({ user }) => {
        return new Response(JSON.stringify({ user }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
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

  async getSession(req: AuthRequest): Promise<SessionData | null> {
    try {
      return await processAuthTokens(
        req,
        this.authManager,
        this.config,
        this.adminManager,
      );
    } catch (e: any) {
      console.error('Error in getSession:', e.message);
      return null;
    }
  }

  setSession(req: AuthRequest, session: SessionData) {
    applySessionToRequest(req, session);
    return req;
  }
}

export * from './auth/types';
export * from './auth/middleware';
