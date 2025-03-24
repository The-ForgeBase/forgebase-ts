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
} from '@nestjs/common';
import { Request, Response } from 'express';
import { User } from '../../../types';
import { AuthGuard } from '../guards/auth.guard';
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
    if (req.headers.authorization?.startsWith('RToken ')) {
      return req.headers.authorization.substring(7);
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
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: this.adminConfig.cookieOptions?.maxAge || 3600000,
          });
          res.cookie('refreshToken', result.token.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: this.adminConfig.cookieOptions?.maxAge || 3600000,
          });
        } else {
          res.cookie('token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: this.adminConfig.cookieOptions?.maxAge || 3600000,
          });
        }
      }

      return res.json(result);
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

      return res.json({ user: result.user });
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

  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(@Req() req: Request, @Res() res: Response) {
    try {
      const token = this.extractToken(req);
      await this.authService.logout(token);
      //TODO: Clear the token cookie and Auth header
      res.clearCookie('token');
      res.clearCookie('refreshToken');
      return { success: true };
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  @Post('refresh')
  @UseGuards(AuthGuard)
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refreshToken = this.extractRefreshToken(req);

    if (!refreshToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const token = await this.authService.refreshToken(refreshToken);
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

  @Post('disable-mfa')
  @UseGuards(AuthGuard)
  async disableMfa(
    @Req() req: Request,
    @Body('code') code: string,
    @Res() res: Response
  ) {
    try {
      const result = await this.authService.disableMfa(req['user'].id, code);
      return res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}
