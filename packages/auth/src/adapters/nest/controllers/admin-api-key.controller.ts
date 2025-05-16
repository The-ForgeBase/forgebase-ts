import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AdminGuard } from '../guards/admin.guard';
import { AdminService } from '../services/admin.service';
import { RequireScopes } from '../decorators/require-scopes.decorator';
import { type Request } from 'express';

@Controller('admin/api-keys')
@UseGuards(AdminGuard)
export class AdminApiKeyController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  async createApiKey(
    @Req() req: Request,
    @Body()
    body: {
      name: string;
      scopes?: string[];
      expires_at?: string | null;
    },
  ) {
    try {
      const adminId = req['admin'].id;

      // Convert expires_at string to Date if provided
      let expiresAt: Date | null = null;
      if (body.expires_at) {
        expiresAt = new Date(body.expires_at);

        // Validate the date
        if (isNaN(expiresAt.getTime())) {
          throw new HttpException(
            'Invalid expires_at date format',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const result = await this.adminService.createApiKey(adminId, {
        name: body.name,
        scopes: body.scopes,
        expires_at: expiresAt,
      });

      return {
        apiKey: {
          id: result.apiKey.id,
          name: result.apiKey.name,
          key_prefix: result.apiKey.key_prefix,
          scopes: result.apiKey.scopes,
          expires_at: result.apiKey.expires_at,
          created_at: result.apiKey.created_at,
        },
        fullKey: result.fullKey,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to create API key',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async listApiKeys(@Req() req: Request) {
    try {
      const adminId = req['admin'].id;
      const apiKeys = await this.adminService.listApiKeys(adminId);

      return apiKeys.map((key) => ({
        id: key.id,
        name: key.name,
        key_prefix: key.key_prefix,
        scopes: key.scopes,
        expires_at: key.expires_at,
        last_used_at: key.last_used_at,
        created_at: key.created_at,
      }));
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to list API keys',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getApiKey(@Req() req: Request, @Param('id') id: string) {
    try {
      const adminId = req['admin'].id;
      const apiKey = await this.adminService.getApiKey(id, adminId);

      return {
        id: apiKey.id,
        name: apiKey.name,
        key_prefix: apiKey.key_prefix,
        scopes: apiKey.scopes,
        expires_at: apiKey.expires_at,
        last_used_at: apiKey.last_used_at,
        created_at: apiKey.created_at,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to get API key',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  async updateApiKey(
    @Req() req: Request,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      scopes?: string[];
      expires_at?: string | null;
    },
  ) {
    try {
      const adminId = req['admin'].id;

      // Convert expires_at string to Date if provided
      let expiresAt: Date | null = null;
      if (body.expires_at === null) {
        expiresAt = null;
      } else if (body.expires_at) {
        expiresAt = new Date(body.expires_at);

        // Validate the date
        if (isNaN(expiresAt.getTime())) {
          throw new HttpException(
            'Invalid expires_at date format',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const apiKey = await this.adminService.updateApiKey(id, adminId, {
        name: body.name,
        scopes: body.scopes,
        expires_at: expiresAt,
      });

      return {
        id: apiKey.id,
        name: apiKey.name,
        key_prefix: apiKey.key_prefix,
        scopes: apiKey.scopes,
        expires_at: apiKey.expires_at,
        last_used_at: apiKey.last_used_at,
        created_at: apiKey.created_at,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to update API key',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @RequireScopes('admin:api-keys:delete')
  async deleteApiKey(@Req() req: Request, @Param('id') id: string) {
    try {
      const adminId = req['admin'].id;
      const deleted = await this.adminService.deleteApiKey(id, adminId);

      if (!deleted) {
        throw new HttpException('API key not found', HttpStatus.NOT_FOUND);
      }

      return { success: true };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to delete API key',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('/initial')
  @RequireScopes('admin:api-keys:create')
  async createInitialApiKey(
    @Req() req: Request,
    @Body()
    body: {
      name?: string;
      scopes?: string[];
    },
  ) {
    try {
      const adminId = req['admin'].id;

      // Check if the user is a super admin
      if (!req['admin'].is_super_admin) {
        throw new HttpException(
          'Only super admins can create initial API keys',
          HttpStatus.FORBIDDEN,
        );
      }

      const result = await this.adminService.createApiKey(adminId, {
        name: body.name || 'Initial Admin API Key',
        scopes: body.scopes || ['*'],
        expires_at: null, // Non-expiring key
      });

      return {
        apiKey: {
          id: result.apiKey.id,
          name: result.apiKey.name,
          key_prefix: result.apiKey.key_prefix,
          scopes: result.apiKey.scopes,
          expires_at: result.apiKey.expires_at,
          created_at: result.apiKey.created_at,
        },
        fullKey: result.fullKey,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to create initial API key',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
