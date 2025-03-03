import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  Query,
  Param,
  Delete,
  Put,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AdminGuard } from '../guards/admin.guard';
import { AdminService } from '../services/admin.service';
import { Public } from '../decorators/public.decorator';
import { NestAuthConfig } from '..';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private adminService: AdminService,
    @Inject('ADMIN_CONFIG') private adminConfig: NestAuthConfig
  ) {}

  @Public()
  @Post('login')
  async login(@Body() body: any, @Res() res: Response) {
    try {
      const { email, password } = body;
      const result = await this.adminService.login(email, password);

      res.cookie(
        this.adminConfig.cookieName
          ? this.adminConfig.cookieName
          : 'admin_token',
        result.token,
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: this.adminConfig.cookieOptions?.maxAge || 3600000,
        }
      );

      return res.json({ admin: result.admin });
    } catch (error) {
      return res.status(401).json({ error: error.message });
    }
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    try {
      const token = this.extractToken(req);
      if (token) {
        await this.adminService.logout(token);
      }

      res.clearCookie('admin_token');
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  @Get('me')
  async getCurrentAdmin(@Req() req: Request) {
    // Admin has already been validated by the guard and attached to the request
    const admin = req['admin'];
    return { admin };
  }

  @Get('admins')
  async listAdmins(@Query('page') page = '1', @Query('limit') limit = '10') {
    return this.adminService.listAdmins(parseInt(page), parseInt(limit));
  }

  @Get('admins/:id')
  async getAdmin(@Param('id') id: string) {
    return this.adminService.getAdmin(id);
  }

  @Post('admins')
  async createAdmin(@Body() body: any, @Req() req: Request) {
    const { email, password, name, role, permissions, is_super_admin } = body;
    const creatorId = req['admin'].id;

    return this.adminService.createAdmin(
      {
        email,
        name,
        role,
        permissions,
        is_super_admin,
      },
      password,
      creatorId
    );
  }

  @Put('admins/:id')
  async updateAdmin(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: Request
  ) {
    const updaterId = req['admin'].id;
    return this.adminService.updateAdmin(id, body, updaterId);
  }

  @Delete('admins/:id')
  async deleteAdmin(@Param('id') id: string, @Req() req: Request) {
    const deleterId = req['admin'].id;
    return this.adminService.deleteAdmin(id, deleterId);
  }

  @Get('audit-logs')
  async getAuditLogs(
    @Query('adminId') adminId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10'
  ) {
    return this.adminService.getAuditLogs(
      adminId,
      parseInt(page),
      parseInt(limit)
    );
  }

  @Get('config')
  async getAuthConfig() {
    return this.adminService.getAuthConfig();
  }

  @Put('config')
  async updateAuthConfig(@Body() config: any, @Req() req: Request) {
    const adminId = req['admin'].id;
    return this.adminService.updateAuthConfig(config, adminId);
  }

  private extractToken(req: Request): string | null {
    if (req.headers.authorization?.startsWith('AdminBearer ')) {
      return req.headers.authorization.substring(12);
    }

    if (req.cookies && req.cookies.admin_token) {
      return req.cookies.admin_token;
    }

    return null;
  }
}
