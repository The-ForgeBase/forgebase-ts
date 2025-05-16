/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Router, Request, Response } from 'ultimate-express';
import { DynamicAuthManager } from '../../../../authManager';
import { UltimateExpressAuthConfig } from '../../types';
import { authGuard } from '../../middleware';

export function createVerifyRouter(
  authManager: DynamicAuthManager,
  config: UltimateExpressAuthConfig,
): Router {
  const router = Router();

  router.post('/verify-email', async (req: Request, res: Response) => {
    try {
      const { code, userId } = req.body;
      const result = await authManager.verifyEmail(userId, code);
      res.status(200).json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  router.post(
    '/send-verification-email',
    async (req: Request, res: Response) => {
      try {
        const { email, redirectUrl } = req.body;
        const token = await authManager.sendVerificationEmail(
          email,
          redirectUrl,
        );
        res.status(200).json({
          success: true,
          message: 'Verification email sent',
          token: token || undefined,
        });
      } catch (e: any) {
        res.status(400).json({ error: e.message });
      }
    },
  );

  router.post('/verify-reset-token', async (req: Request, res: Response) => {
    try {
      const { token, userId } = req.body;
      const result = await authManager.verifyPasswordResetToken(userId, token);
      res.status(200).json({
        success: true,
        message: 'Password reset token verified',
        valid: result,
      });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  router.post('/verify-sms', async (req: Request, res: Response) => {
    try {
      const { code, userId } = req.body;
      const result = await authManager.verifySms(userId, code);
      res.status(200).json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Deprecated: verify-token
  router.post(
    '/verify-token',
    // @ts-ignore
    authGuard,
    async (req: any, res: Response) => {
      try {
        const { token } = req.body;
        const result = await authManager.validateSessionToken(token);
        res.status(200).json({
          success: true,
          message: 'Token verified',
          valid: true,
          user: result,
        });
      } catch (e: any) {
        res.status(400).json({ error: e.message });
      }
    },
  );

  return router;
}
