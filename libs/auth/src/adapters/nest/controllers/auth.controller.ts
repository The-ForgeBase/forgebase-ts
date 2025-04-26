/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  Param,
  Inject,
  Put,
  Delete,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { User } from '../../../types';
import { AuthGuard } from '../guards/auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AuthService } from '../services/auth.service';
import { NestAuthConfig } from '..';

@Controller('auth')
export class AuthController<TUser extends User> {
  constructor(
    private authService: AuthService<TUser>,
    @Inject('AUTH_CONFIG') private adminConfig: NestAuthConfig
  ) {}

  private extractToken(req: Request): string | null {
    if (req.headers.authorization?.startsWith('Bearer ')) {
      return req.headers.authorization.substring(7);
    }

    if (req.cookies && req.cookies.token) {
      return req.cookies.token;
    }
    return null;
  }

  private extractRefreshToken(req: Request): string | null {
    if (req.headers['X-Refresh-Token']) {
      return req.headers['X-Refresh-Token'] as string;
    }
    if (req.cookies && req.cookies.refreshToken) {
      return req.cookies.refreshToken;
    }
    return null;
  }

  @Post('register')
  async register(@Body() body: any, @Res() res: Response) {
    try {
      const { provider, password, ...credentials } = body;
      const result = await this.authService.register(
        provider,
        credentials,
        password
      );
      if (!result.user && result.url && result.token === provider) {
        return res.redirect(result.url.toString());
      }

      if (result.token) {
        // Set the token in the response headers
        if (typeof result.token === 'object' && result.token !== null) {
          res.cookie('token', result.token.accessToken, {
            httpOnly: this.adminConfig.cookieOptions?.httpOnly || true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: this.adminConfig.cookieOptions?.maxAge || 3600000,
            sameSite: this.adminConfig.cookieOptions?.sameSite || 'lax',
            path: this.adminConfig.cookieOptions?.path,
          });
          res.cookie('refreshToken', result.token.refreshToken, {
            httpOnly: this.adminConfig.cookieOptions?.httpOnly || true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: this.adminConfig.cookieOptions?.maxAge || 3600000,
            sameSite: this.adminConfig.cookieOptions?.sameSite || 'lax',
            path: this.adminConfig.cookieOptions?.path,
          });
        } else {
          res.cookie('token', result.token, {
            httpOnly: this.adminConfig.cookieOptions?.httpOnly || true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: this.adminConfig.cookieOptions?.maxAge || 3600000,
            sameSite: this.adminConfig.cookieOptions?.sameSite || 'lax',
            path: this.adminConfig.cookieOptions?.path,
          });
        }
      }

      // Include verification token in the response if available
      const response = {
        ...result,
        verificationToken: result['verificationToken'] || undefined,
      };

      return res.json(response);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  @Post('login')
  async login(@Body() body: any, @Res() res: Response) {
    try {
      const { provider, ...credentials } = body;
      const result = await this.authService.login(provider, credentials);

      if (!result.user && result.url && result.token === provider) {
        return res.redirect(result.url.toString());
      }

      if (!result.user && provider === 'passwordless') {
        return res.json({
          success: true,
          message:
            'Passwordless login initiated, check your email or sms or whatsapp for verification code',
          exp: '15m',
        });
      }

      // Set the token in the response headers
      if (typeof result.token === 'object' && result.token !== null) {
        res.cookie('token', result.token.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
        });
        res.cookie('refreshToken', result.token.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
        });
      } else {
        res.cookie('token', result.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
        });
      }

      return res.json({ user: result.user, token: result.token });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  @Post('passwordless/login')
  async verifyPasswordless(@Param('code') code: string, @Res() res: Response) {
    try {
      const result = await this.authService.passwordlessLogin(code);

      if (!result.user) {
        return res
          .status(400)
          .json({ error: 'Failed to authenticate with passwordless' });
      }

      // Set the token in the response headers
      if (typeof result.token === 'object' && result.token !== null) {
        res.cookie('token', result.token.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
        });
        res.cookie('refreshToken', result.token.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
        });
      } else {
        res.cookie('token', result.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
        });
      }

      return res.json({ user: result.user });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  @Get('oauth/callback')
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('provider') provider: string,
    @Res() res: Response
  ) {
    try {
      if (!code || !state || !provider) {
        throw new UnauthorizedException('Missing required OAuth parameters');
      }

      const { user, token } = await this.authService.oauthCallback(
        provider,
        code,
        state
      );

      if (!user || !token) {
        throw new UnauthorizedException(
          'Failed to authenticate with OAuth provider'
        );
      }

      const providerConfig = await this.authService.getProviderConfig(provider);
      const redirectUrl = providerConfig.redirect_url || '/';

      if (typeof token === 'object' && token !== null) {
        res.cookie('token', token.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: this.adminConfig.cookieOptions?.maxAge || 3600000,
        });
        res.cookie('refreshToken', token.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: this.adminConfig.cookieOptions?.maxAge || 3600000,
        });
      } else {
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: this.adminConfig.cookieOptions?.maxAge || 3600000,
        });
      }
      return res.redirect(redirectUrl);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  @Get('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    console.log('Logout called');
    try {
      const token = this.extractToken(req);
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }
      await this.authService.logout(token);
      res.clearCookie('token');
      res.clearCookie('refreshToken');
      return res.json({ success: true });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  @Post('refresh-token')
  @UseGuards(AuthGuard)
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refreshToken = this.extractRefreshToken(req);

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token not found' });
    }

    try {
      const token = await this.authService.refreshToken(refreshToken);

      // Set secure cookies for the new tokens
      if (typeof token === 'object' && token !== null) {
        res.cookie('token', token.accessToken, {
          httpOnly: this.adminConfig.cookieOptions?.httpOnly || true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: this.adminConfig.cookieOptions?.maxAge || 3600000,
          sameSite: this.adminConfig.cookieOptions?.sameSite || 'lax',
          path: this.adminConfig.cookieOptions?.path || '/',
        });
        res.cookie('refreshToken', token.refreshToken, {
          httpOnly: this.adminConfig.cookieOptions?.httpOnly || true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: this.adminConfig.cookieOptions?.maxAge || 3600000,
          sameSite: this.adminConfig.cookieOptions?.sameSite || 'lax',
          path: this.adminConfig.cookieOptions?.path || '/',
        });
      } else {
        res.cookie('token', token, {
          httpOnly: this.adminConfig.cookieOptions?.httpOnly || true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: this.adminConfig.cookieOptions?.maxAge || 3600000,
          sameSite: this.adminConfig.cookieOptions?.sameSite || 'lax',
          path: this.adminConfig.cookieOptions?.path || '/',
        });
      }

      return res.json({ success: true, token });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  @Post('verify-email')
  async verifyEmail(
    @Body('userId') userId: string,
    @Body('code') code: string,
    @Res() res: Response
  ) {
    try {
      const result = await this.authService.verifyEmail(userId, code);
      return res.json(result);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  @Post('send-verification-email')
  async sendVerificationEmail(
    @Body('email') email: string,
    @Res() res: Response,
    @Body('redirectUrl') redirectUrl?: string
  ) {
    try {
      // Send the verification email with the redirectUrl
      const token = await this.authService.sendVerificationEmail(
        email,
        redirectUrl
      );

      return res.json({
        success: true,
        message: 'Verification email sent',
        token: token || undefined,
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  @Post('forgot-password')
  async forgotPassword(
    @Body('email') email: string,
    @Res() res: Response,
    @Body('redirectUrl') redirectUrl?: string
  ) {
    try {
      // Send the password reset email with the redirectUrl
      const token = await this.authService.sendPasswordResetEmail(
        email,
        redirectUrl
      );

      return res.json({
        success: true,
        message: 'Password reset email sent',
        token: token || undefined,
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  @Post('verify-reset-token')
  async verifyResetToken(
    @Body('userId') userId: string,
    @Body('token') token: string,
    @Res() res: Response
  ) {
    try {
      console.log('Verifying reset token:', token);
      const isValid = await this.authService.verifyPasswordResetToken(
        userId,
        token
      );
      return res.json({ valid: isValid });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  @Post('reset-password')
  async resetPassword(
    @Body('userId') userId: string,
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
    @Res() res: Response
  ) {
    try {
      const success = await this.authService.resetPassword(
        userId,
        newPassword,
        token
      );
      return res.json({ success });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
  async changePassword(
    @Req() req: Request,
    @Body('oldPassword') oldPassword: string,
    @Body('newPassword') newPassword: string,
    @Res() res: Response
  ) {
    try {
      // Get the user ID from the authenticated request
      // @ts-ignore
      const userId = req['user'].id;

      console.log('User ID:', userId);
      console.log('Old Password:', oldPassword);
      console.log('New Password:', newPassword);

      // Call the service to change the password
      const success = await this.authService.changePassword(
        userId,
        oldPassword,
        newPassword
      );

      console.log('Password changed successfully:', success);

      return res.json({ success });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  @Post('verify-sms')
  async verifySms(
    @Body('userId') userId: string,
    @Body('code') code: string,
    @Res() res: Response
  ) {
    try {
      const result = await this.authService.verifySms(userId, code);
      return res.json(result);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  @Post('verify-mfa')
  async verifyMfa(
    @Body('userId') userId: string,
    @Body('code') code: string,
    @Res() res: Response
  ) {
    try {
      const result = await this.authService.verifyMfa(userId, code);
      return res.json(result);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  @Post('enable-mfa')
  @UseGuards(AuthGuard)
  async enableMfa(
    @Req() req: Request,
    @Body('code') code: string,
    @Res() res: Response
  ) {
    try {
      // @ts-ignore
      const result = await this.authService.enableMfa(req['user'].id, code);
      return res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getCurrentUser(@Req() req: Request) {
    // User has already been validated by the guard and attached to the request
    const user = req['user'];
    return { user };
  }

  //TODO: To be deprecated
  @Post('verify-token')
  @UseGuards(AuthGuard)
  async verifyToken(@Body('token') token: string, @Res() res: Response) {
    try {
      // Use the auth service to validate the token
      const result = await this.authService.validateSessionToken(token);

      return res.json({
        valid: true,
        user: result,
      });
    } catch (error) {
      return res.status(401).json({
        valid: false,
        error: error.message,
      });
    }
  }

  @Post('disable-mfa')
  @UseGuards(AuthGuard)
  async disableMfa(
    @Req() req: Request,
    @Body('code') code: string,
    @Res() res: Response
  ) {
    try {
      // @ts-ignore
      const result = await this.authService.disableMfa(req['user'].id, code);
      return res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  @Put('add-labels')
  @UseGuards(AdminGuard)
  async addLabels(
    @Body() data: { userId: string; labels: string[] },
    @Res() res: Response
  ) {
    try {
      const labels = await this.authService.addLabels(data.userId, data.labels);

      return res.json(labels);
    } catch (error) {
      res.status(400).json({ error, message: error.message });
    }
  }

  @Post('set-labels')
  @UseGuards(AdminGuard)
  async setLabels(
    @Body() data: { userId: string; labels: string[] },
    @Res() res: Response
  ) {
    try {
      const labels = await this.authService.setLabels(data.userId, data.labels);

      return res.json(labels);
    } catch (error) {
      res.status(400).json({ error, message: error.message });
    }
  }

  @Delete('remove-labels')
  @UseGuards(AdminGuard)
  async removeLabels(
    @Body() data: { userId: string; labels: string[] },
    @Res() res: Response
  ) {
    try {
      const labels = await this.authService.removeLabels(
        data.userId,
        data.labels
      );

      return res.json(labels);
    } catch (error) {
      res.status(400).json({ error, message: error.message });
    }
  }

  @Put('add-permissions')
  @UseGuards(AdminGuard)
  async addPermissions(
    @Body() data: { userId: string; permissions: string[] },
    @Res() res: Response
  ) {
    try {
      const permissions = await this.authService.addPermissions(
        data.userId,
        data.permissions
      );

      return res.json(permissions);
    } catch (error) {
      res.status(400).json({ error, message: error.message });
    }
  }

  @Post('set-permissions')
  @UseGuards(AdminGuard)
  async setPermissions(
    @Body() data: { userId: string; permissions: string[] },
    @Res() res: Response
  ) {
    try {
      const permissions = await this.authService.setPermissions(
        data.userId,
        data.permissions
      );

      return res.json(permissions);
    } catch (error) {
      res.status(400).json({ error, message: error.message });
    }
  }

  @Delete('remove-permissions')
  @UseGuards(AdminGuard)
  async removePermissions(
    @Body() data: { userId: string; permissions: string[] },
    @Res() res: Response
  ) {
    try {
      const permissions = await this.authService.removePermissions(
        data.userId,
        data.permissions
      );

      return res.json(permissions);
    } catch (error) {
      res.status(400).json({ error, message: error.message });
    }
  }

  @Post('set-teams')
  @UseGuards(AdminGuard)
  async setTeams(
    @Body() data: { userId: string; teams: string[] },
    @Res() res: Response
  ) {
    try {
      const teams = await this.authService.setTeams(data.userId, data.teams);

      return res.json(teams);
    } catch (error) {
      res.status(400).json({ error, message: error.message });
    }
  }

  @Put('add-teams')
  @UseGuards(AdminGuard)
  async addTeams(
    @Body() data: { userId: string; teams: string[] },
    @Res() res: Response
  ) {
    try {
      const teams = await this.authService.addTeams(data.userId, data.teams);

      return res.json(teams);
    } catch (error) {
      res.status(400).json({ error, message: error.message });
    }
  }

  @Delete('remove-teams')
  @UseGuards(AdminGuard)
  async removeTeams(
    @Body() data: { userId: string; teams: string[] },
    @Res() res: Response
  ) {
    try {
      const teams = await this.authService.removeTeams(data.userId, data.teams);

      return res.json(teams);
    } catch (error) {
      res.status(400).json({ error, message: error.message });
    }
  }

  @Put('update-role')
  @UseGuards(AdminGuard)
  async updateRole(
    @Body() data: { userId: string; role: string },
    @Res() res: Response
  ) {
    try {
      await this.authService.setRole(data.userId, data.role);

      return res.json({
        role: data.role,
      });
    } catch (error) {
      res.status(400).json({ error, message: error.message });
    }
  }
}
