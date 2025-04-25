import { RouterType } from 'itty-router';
import { WebAuthConfig } from '../..';
import { BaseUser } from '../../../../types';
import { DynamicAuthManager } from '../../../../authManager';
import { AuthRequest } from './types';
import { authGuard } from './middleware';

export function verifyEndpoints<TUser extends BaseUser>(
  router: RouterType<AuthRequest>,
  authManager: DynamicAuthManager<TUser>
) {
  router.post('/verify-email', async ({ json }) => {
    try {
      const { code, userId } = await json();
      const result = await authManager.verifyEmail(userId, code);
      //TODO: check for security
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  });

  router.post('/send-verification-email', async ({ json }) => {
    try {
      const { email, redirectUrl } = await json();
      const token = await authManager.sendVerificationEmail(email, redirectUrl);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Verification email sent',
          token: token || undefined,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  });

  router.post('/verify-reset-token', async ({ json }) => {
    try {
      const { token, userId } = await json();
      const result = await authManager.verifyPasswordResetToken(userId, token);
      //TODO: check for security
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Password reset token verified',
          valid: result,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  });

  router.post('/verify-sms', async ({ json }) => {
    try {
      const { code, userId } = await json();
      const result = await authManager.verifySms(userId, code);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  });

  //TODO: To be deprecated
  router.post(
    '/verify-token',
    async (req) => authGuard(req, authManager),
    async ({ json }) => {
      try {
        const { token } = await json();
        const result = await authManager.validateSessionToken(token);
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Token verified',
            valid: true,
            user: result,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  );
}
