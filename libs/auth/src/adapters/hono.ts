import { Context } from 'hono';
import { DynamicAuthManager } from '../authManager';
import { User, MFARequiredError } from '../types';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';

export interface HonoAuthConfig {
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

export class HonoAuthAdapter<TUser extends User> {
  private defaultConfig: HonoAuthConfig = {
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
    private config: HonoAuthConfig = {}
  ) {
    this.config = { ...this.defaultConfig, ...config };
  }

  authenticate = async (c: Context, next: () => Promise<void>) => {
    const token = this.extractToken(c);
    if (!token) {
      return c.json({ error: 'No token provided' }, 401);
    }

    try {
      const { user, token: newToken } = await this.authManager.validateToken(
        token,
        'local'
      );
      const config = this.authManager.getConfig();
      const mfaStatus = this.authManager.getMfaStatus();

      if (!user || !newToken) {
        return c.json({ error: 'Invalid token' }, 401);
      }

      if (newToken) {
        if (typeof newToken === 'object' && newToken !== null) {
          setCookie(c, 'token', newToken.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
          });
          setCookie(c, 'refreshToken', newToken.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
          });
        } else {
          setCookie(c, 'token', newToken as string, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
          });
        }
      }

      if (
        config.mfaSettings.required &&
        mfaStatus &&
        !user.mfa_enabled &&
        !c.req.path.includes('mfa')
      ) {
        throw new MFARequiredError();
      }

      c.set('user', user);
      await next();
    } catch (error) {
      return c.json({ error: 'Invalid token' }, 401);
    }
  };

  private extractToken(c: Context): string | null {
    const authHeader = c.req.header('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    const cookies = getCookie(c, 'token');
    if (cookies) {
      return cookies;
    }
    return null;
  }

  setupRoutes(app: any) {
    app.get(this.config.oauthCallbackPath, async (c: Context) => {
      try {
        const { code, state, provider } = c.req.query();
        if (!code || !state || !provider) {
          return c.json({ error: 'Missing required OAuth parameters' }, 400);
        }

        const { user, token } = await this.authManager.oauthCallback(provider, {
          code,
          state,
        });

        if (!user || !token) {
          return c.json(
            { error: 'Failed to authenticate with OAuth provider' },
            400
          );
        }

        const providerConfig = await this.authManager.getProviderConfig(
          provider
        );

        // Redirect to the frontend with success or error
        const redirectUrl = providerConfig.redirect_url || '/';
        setCookie(c, 'token', token as string, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
        });

        return c.redirect(redirectUrl);
      } catch (error) {
        console.error('OAuth callback error:', error);
        return c.json({ error: error.message }, 400);
      }
    });

    app.post(this.config.registerPath, async (c: Context) => {
      try {
        const body = await c.req.json();
        const { provider, password, ...credentials } = body;
        const result = await this.authManager.register(
          provider,
          credentials,
          password
        );

        if (!result.user && result.url && result.token === provider) {
          return c.redirect(result.url.toString());
        }

        return c.json(result);
      } catch (error) {
        return c.json({ error: error.message }, 400);
      }
    });

    app.post(this.config.loginPath, async (c: Context) => {
      try {
        const body = await c.req.json();
        const { provider, ...credentials } = body;
        const result = await this.authManager.login(provider, credentials);

        if (!result.user && result.url && result.token === provider) {
          return c.redirect(result.url.toString());
        }

        if (!result.user && provider === 'passwordless') {
          return c.json({
            success: true,
            message:
              'Passwordless login initiated, check your email or sms or whatsapp for verification code',
            exp: '15m',
          });
        }

        return c.json(result);
      } catch (error) {
        return c.json({ error: error.message }, 400);
      }
    });

    app.post(this.config.passwordlessLogin, async (c: Context) => {
      try {
        const { code } = c.req.param();
        const result = await this.authManager.validateToken(
          code,
          'passwordless'
        );
        return c.json(result);
      } catch (error) {
        return c.json({ error: error.message }, 400);
      }
    });

    app.post(this.config.logoutPath, this.authenticate, async (c: Context) => {
      try {
        const token = this.extractToken(c);
        await this.authManager.logout(token);
        deleteCookie(c, 'token');
        return c.json({ success: true });
      } catch (error) {
        return c.json({ error: error.message }, 400);
      }
    });

    app.post(this.config.refreshPath, async (c: Context) => {
      try {
        const { refreshToken } = await c.req.json();
        const result = await this.authManager.refreshToken(refreshToken);
        return c.json(result);
      } catch (error) {
        return c.json({ error: error.message }, 400);
      }
    });

    app.post(this.config.verifyEmailPath, async (c: Context) => {
      try {
        const { userId, code } = await c.req.json();
        const result = await this.authManager.verifyEmail(userId, code);
        return c.json(result);
      } catch (error) {
        return c.json({ error: error.message }, 400);
      }
    });

    app.post(this.config.verifySmsPath, async (c: Context) => {
      try {
        const { userId, code } = await c.req.json();
        const result = await this.authManager.verifySms(userId, code);
        return c.json(result);
      } catch (error) {
        return c.json({ error: error.message }, 400);
      }
    });

    app.post(this.config.verifyMfaPath, async (c: Context) => {
      try {
        const { userId, code } = await c.req.json();
        const result = await this.authManager.verifyMfa(userId, code);
        return c.json(result);
      } catch (error) {
        return c.json({ error: error.message }, 400);
      }
    });

    app.post(
      this.config.enableMfaPath,
      this.authenticate,
      async (c: Context) => {
        try {
          const { code } = await c.req.json();
          const user = c.get('user') as TUser;
          const result = await this.authManager.enableMfa(user.id, code);
          return c.json(result);
        } catch (error) {
          return c.json({ error: error.message }, 400);
        }
      }
    );

    app.post(
      this.config.disableMfaPath,
      this.authenticate,
      async (c: Context) => {
        try {
          const { code } = await c.req.json();
          const user = c.get('user') as TUser;
          await this.authManager.disableMfa(user.id, code);
          return c.json({ success: true });
        } catch (error) {
          return c.json({ error: error.message }, 400);
        }
      }
    );
  }
}
