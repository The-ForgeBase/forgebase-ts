import { RouterType, error } from 'itty-router';
import { BaseUser } from '../../../../types';
import { DynamicAuthManager } from '../../../../authManager';
import { authGuard } from './middleware';
import { AuthRequest } from './types';

export function passwordEndpoints<TUser extends BaseUser>(
  router: RouterType<AuthRequest>,
  authManager: DynamicAuthManager<TUser>
) {
  router.post('/forgot-password', async ({ json }) => {
    try {
      const { email, redirectUrl } = await json();
      const token = await authManager.sendPasswordResetEmail(
        email,
        redirectUrl
      );
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Password reset email sent',
          token: token || undefined,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (e) {
      return error(400, e.message);
    }
  });

  router.post('/reset-password', async ({ json }) => {
    try {
      const { token, userId, newPassword } = await json();
      const result = await authManager.resetPassword(
        userId,
        newPassword,
        token
      );

      return new Response(
        JSON.stringify({
          success: result,
          message: 'Password reset successful',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (e) {
      return error(400, e.message);
    }
  });

  router.post(
    '/change-password',
    async (req) => authGuard(req, authManager),
    async (req) => {
      try {
        const userId = req['user'].id;
        const { oldPassword, newPassword } = await req.json();
        const success = await authManager.changePassword(
          userId,
          oldPassword,
          newPassword
        );

        return new Response(
          JSON.stringify({
            success,
            message: 'Password changed successfully',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } catch (e) {
        return error(400, e.message);
      }
    }
  );
}
