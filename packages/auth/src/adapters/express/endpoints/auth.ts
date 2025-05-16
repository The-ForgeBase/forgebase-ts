/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Router, Request, Response } from 'express';
import { DynamicAuthManager } from '../../../authManager';
import { InternalAdminManager } from '../../../admin/internal-admin-manager';
import { ExpressAuthConfig, ExpressAuthRequest } from '../types';
import { authGuard } from '../middleware';
import {
  setAuthCookies,
  extractTokenFromRequest,
  extractRefreshTokenFromRequest,
} from '../utils';
import { createPasswordRouter } from './auth/password';
import { createVerifyRouter } from './auth/verify';
import { createRpltRouter } from './auth/rplt';

export function createAuthRouter(
  authManager: DynamicAuthManager,
  adminManager: InternalAdminManager,
  config: ExpressAuthConfig,
): Router {
  const router = Router();

  // Registration endpoint
  router.post(
    '/register',
    async (req: Request, res: Response): Promise<any | Response> => {
      try {
        const { provider, password, ...credentials } = req.body;
        const result = await authManager.register(
          provider,
          credentials,
          password,
        );

        if (!result.user && result.url && result.token === provider) {
          // OAuth redirect
          return res.redirect(result.url.toString());
        }

        if (result.token) {
          setAuthCookies(res, result.token, config);
        }
        res.status(201).json(result);
      } catch (e: any) {
        res.status(400).json({ error: e.message });
      }
    },
  );

  // Login endpoint
  router.post(
    '/login',
    async (req: Request, res: Response): Promise<any | Response> => {
      try {
        const { provider, ...credentials } = req.body;
        const result = await authManager.login(provider, credentials);

        if (!result.user && result.url && result.token === provider) {
          // OAuth redirect
          return res.redirect(result.url.toString());
        }

        if (!result.user && provider === 'passwordless') {
          return res.status(200).json({
            success: true,
            message:
              'Passwordless login initiated, check your email or sms or whatsapp for verification code',
            exp: '15m',
          });
        }

        if (result.token) {
          setAuthCookies(res, result.token, config);
        }
        res.status(201).json({ user: result.user, token: result.token });
      } catch (e: any) {
        res.status(400).json({ error: e.message });
      }
    },
  );

  // Logout endpoint
  router.get(
    '/logout',
    async (req: Request, res: Response): Promise<any | Response> => {
      try {
        const token = extractTokenFromRequest(req, config);
        if (!token) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        await authManager.logout(token);
        res.clearCookie(config.cookieName!);
        res.clearCookie('refreshToken');
        res.status(200).json({ success: true });
      } catch (e: any) {
        res.status(400).json({ error: e.message });
      }
    },
  );

  // Refresh token endpoint
  router.post(
    '/refresh-token',
    // @ts-ignore
    authGuard,
    async (req: Request, res: Response): Promise<any | Response> => {
      try {
        const refreshToken = extractRefreshTokenFromRequest(req);
        if (!refreshToken) {
          return res.status(403).json({ error: 'Refresh token not found' });
        }
        const token = await authManager.refreshToken(refreshToken);
        setAuthCookies(res, token, config);
        res.status(200).json({ token });
      } catch (e: any) {
        res.status(400).json({ error: e.message });
      }
    },
  );

  // Get current user endpoint
  router.get(
    '/me',
    // @ts-ignore
    authGuard,
    async (req: ExpressAuthRequest, res: Response): Promise<any | Response> => {
      try {
        res.status(200).json({ user: req.user });
      } catch (e: any) {
        res.status(400).json({ error: e.message });
      }
    },
  );

  router.use('/password', createPasswordRouter(authManager, config));
  router.use('/verify', createVerifyRouter(authManager, config));
  router.use('/rplt', createRpltRouter(authManager, adminManager, config));

  return router;
}
