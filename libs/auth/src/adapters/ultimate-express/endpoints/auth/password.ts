import { Router, Request, Response } from 'ultimate-express';
import { DynamicAuthManager } from '../../../../authManager';
import { UltimateExpressAuthConfig } from '../../types';
import { authGuard } from '../../middleware';

export function createPasswordRouter(
  authManager: DynamicAuthManager,
  config: UltimateExpressAuthConfig
): Router {
  const router = Router();

  router.post('/forgot-password', async (req: Request, res: Response) => {
    try {
      const { email, redirectUrl } = req.body;
      const token = await authManager.sendPasswordResetEmail(
        email,
        redirectUrl
      );
      res.status(200).json({
        success: true,
        message: 'Password reset email sent',
        token: token || undefined,
      });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  router.post('/reset-password', async (req: Request, res: Response) => {
    try {
      const { token, userId, newPassword } = req.body;
      const result = await authManager.resetPassword(
        userId,
        newPassword,
        token
      );
      res.status(200).json({
        success: result,
        message: 'Password reset successful',
      });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  router.post(
    '/change-password',
    authGuard,
    async (req: any, res: Response) => {
      try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;
        const success = await authManager.changePassword(
          userId,
          oldPassword,
          newPassword
        );
        res.status(200).json({
          success,
          message: 'Password changed successfully',
        });
      } catch (e: any) {
        res.status(400).json({ error: e.message });
      }
    }
  );

  return router;
}
