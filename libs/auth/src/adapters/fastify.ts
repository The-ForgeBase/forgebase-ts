import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { FastifyCookieOptions } from '@fastify/cookie';
import cookie from '@fastify/cookie';
import { DynamicAuthManager } from '../authManager';
import { User, MFARequiredError } from '../types';
import { AuthFrameworkAdapter } from './framework';

export interface FastifyAuthConfig {
  loginPath?: string;
  passwordlessLogin?: string;
  registerPath?: string;
  logoutPath?: string;
  refreshPath?: string;
  verifyEmailPath?: string;
  verifySmsPath?: string;
  verifyMfaPath?: string;
  enableMfaPath?: string;
  disableMfaPath?: string;
  oauthCallbackPath?: string;
}

export class FastifyAuthAdapter<TUser extends User> {
  private defaultConfig: FastifyAuthConfig = {
    loginPath: '/auth/login',
    passwordlessLogin: '/auth/passwordless/login',
    registerPath: '/auth/register',
    logoutPath: '/auth/logout',
    refreshPath: '/auth/refresh',
    verifyEmailPath: '/auth/verify-email',
    verifySmsPath: '/auth/verify-sms',
    verifyMfaPath: '/auth/verify-mfa',
    enableMfaPath: '/auth/enable-mfa',
    disableMfaPath: '/auth/disable-mfa',
    oauthCallbackPath: '/auth/oauth/callback',
  };

  constructor(
    private authManager: DynamicAuthManager<TUser>,
    private config: FastifyAuthConfig = {}
  ) {
    this.config = { ...this.defaultConfig, ...config };
  }

  authenticate = async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const token = this.extractToken(request);
    if (!token) {
      reply.code(401).send({ error: 'No token provided' });
      return;
    }

    try {
      const user = await this.authManager.validateToken(token, 'local');
      const config = this.authManager.getConfig();
      const mfaStatus = this.authManager.getMfaStatus();

      if (
        config.mfaSettings.required &&
        mfaStatus &&
        !user.mfa_enabled &&
        !request.url.includes('mfa')
      ) {
        throw new MFARequiredError();
      }

      request['user'] = user;
    } catch (error) {
      reply.code(401).send({ error: 'Invalid token' });
    }
  };

  private extractToken(request: FastifyRequest): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    const token = request.cookies?.token;
    if (token) {
      return token;
    }
    return null;
  }

  setupRoutes(fastify: FastifyInstance, setupCookies: boolean = true) {
    if (setupCookies) {
      fastify.register(cookie, {
        secret: process.env.COOKIE_SECRET as string,
      } as FastifyCookieOptions);
    }
    fastify.get(this.config.oauthCallbackPath, async (request, reply) => {
      try {
        const { code, state, provider } = request.query as {
          code?: string;
          state?: string;
          provider?: string;
        };

        if (!code || !state || !provider) {
          return reply
            .code(400)
            .send({ error: 'Missing required OAuth parameters' });
        }

        const { user, token } = await this.authManager.login(provider, {
          code,
          state,
        });

        if (!user || !token) {
          return reply
            .code(400)
            .send({ error: 'Failed to authenticate with OAuth provider' });
        }

        const providerConfig = await this.authManager.getProviderConfig(
          provider
        );

        // Redirect to the frontend with success or error
        const redirectUrl = providerConfig.redirect_url || '/';
        reply.setCookie('token', token as string, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
        });
        return reply.redirect(redirectUrl);
      } catch (error) {
        console.error('OAuth callback error:', error);
        return reply.code(400).send({ error: error.message });
      }
    });

    fastify.post(this.config.registerPath, async (request, reply) => {
      try {
        const { provider, password, ...credentials } = request.body as {
          provider: string;
          password: string;
          [key: string]: any;
        };

        const result = await this.authManager.register(
          provider,
          credentials as Partial<TUser>,
          password
        );

        if (!result.user && result.url && result.token === provider) {
          return reply.redirect(result.url.toString());
        }

        return reply.send(result);
      } catch (error) {
        return reply.code(400).send({ error: error.message });
      }
    });

    fastify.post(this.config.loginPath, async (request, reply) => {
      try {
        const { provider, ...credentials } = request.body as {
          provider: string;
          [key: string]: any;
        };

        const result = await this.authManager.login(provider, credentials);

        if (!result.user && result.url && result.token === provider) {
          return reply.redirect(result.url.toString());
        }

        if (!result.user && provider === 'passwordless') {
          return reply.send({
            success: true,
            message:
              'Passwordless login initiated, check your email or sms or whatsapp for verification code',
            exp: '15m',
          });
        }

        return reply.send(result);
      } catch (error) {
        return reply.code(400).send({ error: error.message });
      }
    });

    fastify.post(this.config.passwordlessLogin, async (request, reply) => {
      try {
        const { code } = request.params as { code: string };
        const result = await this.authManager.validateToken(
          code,
          'passwordless'
        );
        return reply.send(result);
      } catch (error) {
        return reply.code(400).send({ error: error.message });
      }
    });

    fastify.post(
      this.config.logoutPath,
      { preHandler: [this.authenticate] },
      async (request, reply) => {
        try {
          const token = this.extractToken(request);
          await this.authManager.logout(token);
          return reply.send({ success: true });
        } catch (error) {
          return reply.code(400).send({ error: error.message });
        }
      }
    );

    fastify.post(this.config.refreshPath, async (request, reply) => {
      try {
        const { refreshToken } = request.body as { refreshToken: string };
        const result = await this.authManager.refreshToken(refreshToken);
        return reply.send(result);
      } catch (error) {
        return reply.code(400).send({ error: error.message });
      }
    });

    fastify.post(this.config.verifyEmailPath, async (request, reply) => {
      try {
        const { userId, code } = request.body as {
          userId: string;
          code: string;
        };
        const result = await this.authManager.verifyEmail(userId, code);
        return reply.send(result);
      } catch (error) {
        return reply.code(400).send({ error: error.message });
      }
    });

    fastify.post(this.config.verifySmsPath, async (request, reply) => {
      try {
        const { userId, code } = request.body as {
          userId: string;
          code: string;
        };
        const result = await this.authManager.verifySms(userId, code);
        return reply.send(result);
      } catch (error) {
        return reply.code(400).send({ error: error.message });
      }
    });

    fastify.post(this.config.verifyMfaPath, async (request, reply) => {
      try {
        const { userId, code } = request.body as {
          userId: string;
          code: string;
        };
        const result = await this.authManager.verifyMfa(userId, code);
        return reply.send(result);
      } catch (error) {
        return reply.code(400).send({ error: error.message });
      }
    });

    fastify.post(
      this.config.enableMfaPath,
      { preHandler: [this.authenticate] },
      async (request, reply) => {
        try {
          const { code } = request.body as { code: string };
          const result = await this.authManager.enableMfa(
            (request['user'] as TUser).id,
            code
          );
          return reply.send(result);
        } catch (error) {
          return reply.code(400).send({ error: error.message });
        }
      }
    );

    fastify.post(
      this.config.disableMfaPath,
      { preHandler: [this.authenticate] },
      async (request, reply) => {
        try {
          const { code } = request.body as { code: string };
          await this.authManager.disableMfa(
            (request['user'] as TUser).id,
            code
          );
          return reply.send({ success: true });
        } catch (error) {
          return reply.code(400).send({ error: error.message });
        }
      }
    );
  }
}

export class FastifyAdapter implements AuthFrameworkAdapter {
  async getRequestData(req: FastifyRequest) {
    return {
      headers: req.headers as Record<string, string>,
      cookies: req.cookies || {},
      body: req.body,
      query: req.query as Record<string, string>,
    };
  }

  async setResponseData(
    reply: FastifyReply,
    data: {
      headers?: Record<string, string>;
      cookies?: Array<{
        name: string;
        value: string;
        options?: Record<string, any>;
      }>;
      status?: number;
      body?: unknown;
    }
  ): Promise<void> {
    if (data.headers) {
      Object.entries(data.headers).forEach(([key, value]) => {
        reply.header(key, value);
      });
    }

    if (data.cookies) {
      data.cookies.forEach(({ name, value, options }) => {
        reply.setCookie(name, value, options);
      });
    }

    if (data.status) {
      reply.status(data.status);
    }

    if (data.body !== undefined) {
      reply.send(data.body);
    }
  }

  createError(status: number, message: string): Error {
    const error = new Error(message);
    (error as any).statusCode = status;
    return error;
  }
}
