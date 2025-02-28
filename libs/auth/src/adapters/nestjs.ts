// import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
// import { Request, Response, NextFunction } from 'express';
// import { DynamicAuthManager } from '../authManager';
// import { User, MFARequiredError } from '../types';

export interface NestAuthConfig {
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

export * from './nest'

// @Injectable()
// export class NestAuthAdapter<TUser extends User> implements NestMiddleware {
//   private defaultConfig: NestAuthConfig = {
//     loginPath: '/auth/login',
//     passwordlessLogin: '/auth/passwordless/login',
//     registerPath: '/auth/register',
//     logoutPath: '/auth/logout',
//     refreshPath: '/auth/refresh',
//     verifyEmailPath: '/auth/verify-email',
//     verifySmsPath: '/auth/verify-sms',
//     verifyMfaPath: '/auth/verify-mfa',
//     enableMfaPath: '/auth/enable-mfa',
//     disableMfaPath: '/auth/disable-mfa',
//     oauthCallbackPath: '/auth/oauth/callback',
//   };

//   constructor(
//     @Inject('AUTH_MANAGER') private authManager: DynamicAuthManager<TUser>,
//     @Inject('AUTH_CONFIG') private config: NestAuthConfig = {}
//   ) {
//     this.config = { ...this.defaultConfig, ...config };
//   }

//   async use(req: Request, res: Response, next: NextFunction) {
//     const token = this.extractToken(req);
//     if (!token) {
//       return res.status(401).json({ error: 'No token provided' });
//     }

//     try {
//       const user = await this.authManager.validateToken(token, 'local');
//       const config = this.authManager.getConfig();
//       const mfaStatus = this.authManager.getMfaStatus();

//       if (
//         config.mfaSettings.required &&
//         mfaStatus &&
//         !user.mfa_enabled &&
//         !req.path.includes('mfa')
//       ) {
//         throw new MFARequiredError();
//       }

//       req['user'] = user;
//       next();
//     } catch (error) {
//       res.status(401).json({ error: 'Invalid token' });
//     }
//   }

//   private extractToken(req: Request): string | null {
//     if (req.headers.authorization?.startsWith('Bearer ')) {
//       return req.headers.authorization.substring(7);
//     }

//     if (req.cookies && req.cookies.token) {
//       return req.cookies.token;
//     }
//     return null;
//   }

//   setupRoutes(app: any) {
//     app.get(
//       this.config.oauthCallbackPath,
//       async (req: Request, res: Response) => {
//         try {
//           const { code, state, provider } = req.query;
//           if (!code || !state || !provider) {
//             return res
//               .status(400)
//               .json({ error: 'Missing required OAuth parameters' });
//           }

//           const { user, token } = await this.authManager.oauthCallback(
//             provider as string,
//             {
//               code: code as string,
//               state: state as string,
//             }
//           );

//           if (!user || !token) {
//             return res
//               .status(400)
//               .json({ error: 'Failed to authenticate with OAuth provider' });
//           }

//           const providerConfig = await this.authManager.getProviderConfig(
//             provider as string
//           );

//           // Redirect to the frontend with success or error
//           const redirectUrl = providerConfig.redirect_url || '/';
//           res.cookie('token', token, {
//             httpOnly: true,
//             secure: process.env.NODE_ENV === 'production',
//           });
//           res.redirect(redirectUrl);
//         } catch (error) {
//           console.error('OAuth callback error:', error);
//           res.status(400).json({ error: error.message });
//         }
//       }
//     );

//     app.post(this.config.registerPath, async (req: Request, res: Response) => {
//       try {
//         const { provider, ...credentials } = req.body;
//         const password = req.body.password;
//         const result = await this.authManager.register(
//           provider,
//           credentials,
//           password
//         );

//         if (!result.user && result.url && result.token === provider) {
//           return res.redirect(result.url.toString());
//         }

//         res.json(result);
//       } catch (error) {
//         res.status(400).json({ error: error.message });
//       }
//     });

//     app.post(this.config.loginPath, async (req: Request, res: Response) => {
//       try {
//         const { provider, ...credentials } = req.body;
//         const result = await this.authManager.login(provider, credentials);
//         if (!result.user && result.url && result.token === provider) {
//           return res.redirect(result.url.toString());
//         }

//         if (!result.user && provider === 'passwordless') {
//           return res.json({
//             success: true,
//             message:
//               'Passwordless login initiated, check your email or sms or whatsapp for verification code',
//             exp: '15m',
//           });
//         }

//         res.json(result);
//       } catch (error) {
//         res.status(400).json({ error: error.message });
//       }
//     });

//     app.post(
//       this.config.passwordlessLogin,
//       async (req: Request, res: Response) => {
//         try {
//           const { code } = req.params;
//           const result = await this.authManager.validateToken(
//             code,
//             'passwordless'
//           );
//           res.json(result);
//         } catch (error) {
//           res.status(400).json({ error: error.message });
//         }
//       }
//     );

//     app.post(
//       this.config.logoutPath,
//       this.use.bind(this),
//       async (req: Request, res: Response) => {
//         try {
//           const token = this.extractToken(req);
//           await this.authManager.logout(token);
//           res.clearCookie('token');
//           res.json({ success: true });
//         } catch (error) {
//           res.status(400).json({ error: error.message });
//         }
//       }
//     );

//     app.post(this.config.refreshPath, async (req: Request, res: Response) => {
//       try {
//         const { refreshToken } = req.body;
//         const result = await this.authManager.refreshToken(refreshToken);
//         res.json(result);
//       } catch (error) {
//         res.status(400).json({ error: error.message });
//       }
//     });

//     app.post(
//       this.config.verifyEmailPath,
//       async (req: Request, res: Response) => {
//         try {
//           const { userId, code } = req.body;
//           const result = await this.authManager.verifyEmail(userId, code);
//           res.json(result);
//         } catch (error) {
//           res.status(400).json({ error: error.message });
//         }
//       }
//     );

//     app.post(this.config.verifySmsPath, async (req: Request, res: Response) => {
//       try {
//         const { userId, code } = req.body;
//         const result = await this.authManager.verifySms(userId, code);
//         res.json(result);
//       } catch (error) {
//         res.status(400).json({ error: error.message });
//       }
//     });

//     app.post(this.config.verifyMfaPath, async (req: Request, res: Response) => {
//       try {
//         const { userId, code } = req.body;
//         const result = await this.authManager.verifyMfa(userId, code);
//         res.json(result);
//       } catch (error) {
//         res.status(400).json({ error: error.message });
//       }
//     });

//     app.post(
//       this.config.enableMfaPath,
//       this.use.bind(this),
//       async (req: Request, res: Response) => {
//         try {
//           const { code } = req.body;
//           const result = await this.authManager.enableMfa(req['user'].id, code);
//           res.json(result);
//         } catch (error) {
//           res.status(400).json({ error: error.message });
//         }
//       }
//     );

//     app.post(
//       this.config.disableMfaPath,
//       this.use.bind(this),
//       async (req: Request, res: Response) => {
//         try {
//           const { code } = req.body;
//           await this.authManager.disableMfa(req['user'].id, code);
//           res.json({ success: true });
//         } catch (error) {
//           res.status(400).json({ error: error.message });
//         }
//       }
//     );
//   }
// }