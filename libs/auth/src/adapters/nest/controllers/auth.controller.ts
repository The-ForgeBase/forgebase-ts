import { Controller, Post, Get, Body, Query, Req, Res, UseGuards, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { User } from '../../../types';
import { AuthGuard } from '../guards/auth.guard';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController<TUser extends User> {
  constructor(private authService: AuthService<TUser>) {}

  @Post('register')
  async register(@Body() body: any,  @Res() res: Response) {
    try {
      const { provider, password, ...credentials } = body;
      const result = await this.authService.register(provider, credentials, password);
      if (!result.user && result.url && result.token === provider) {
        return res.redirect(result.url.toString());
      }
  
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  @Post('login')
  async login(@Body() body: any) {
    const { provider, ...credentials } = body;
    return this.authService.login(provider, credentials);
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
        throw new UnauthorizedException('Failed to authenticate with OAuth provider');
      }
  
      const providerConfig = await this.authService.getProviderConfig(provider);
      const redirectUrl = providerConfig.redirect_url || '/';
  
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      });
      res.redirect(redirectUrl);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(@Req() req: Request, @Res() res: Response) {
    const token = req.cookies?.token || req.headers.authorization?.substring(7);
    await this.authService.logout(token);
    res.clearCookie('token');
    return { success: true };
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Post('verify-email')
  async verifyEmail(@Body('userId') userId: string, @Body('code') code: string) {
    return this.authService.verifyEmail(userId, code);
  }

  @Post('verify-sms')
  async verifySms(@Body('userId') userId: string, @Body('code') code: string) {
    return this.authService.verifySms(userId, code);
  }

  @Post('verify-mfa')
  async verifyMfa(@Body('userId') userId: string, @Body('code') code: string) {
    return this.authService.verifyMfa(userId, code);
  }

  @Post('enable-mfa')
  @UseGuards(AuthGuard)
  async enableMfa(@Req() req: Request, @Body('code') code?: string) {
    return this.authService.enableMfa(req['user'].id, code);
  }

  @Post('disable-mfa')
  @UseGuards(AuthGuard)
  async disableMfa(@Req() req: Request, @Body('code') code: string) {
    return this.authService.disableMfa(req['user'].id, code);
  }
}