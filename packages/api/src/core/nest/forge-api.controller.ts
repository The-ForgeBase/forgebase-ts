import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Req,
  HttpStatus,
  HttpException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ForgeApiService } from './forge-api.service';
import {
  DataMutationParams,
  DataQueryParams,
  AuthenticationRequiredError,
  PermissionDeniedError,
  AdvanceDataMutationParams,
} from '@the-forgebase/database';
import { ApiAdmin } from './decorators/admin.decorator';
import { ApiPublic } from './decorators/public.decorator';
import { AdminGuard } from './guards/admin.guard';

@Controller()
@UseGuards(AdminGuard)
export class ForgeApiController {
  constructor(private readonly forgeApiService: ForgeApiService) {}

  @Get('db/schema')
  @ApiAdmin()
  async getSchema() {
    try {
      return await this.forgeApiService.getDatabaseService().getSchema();
    } catch (error) {
      console.error('Error getting schema:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('db/schema/tables')
  @ApiAdmin()
  async getTables() {
    try {
      return await this.forgeApiService.getDatabaseService().getTables();
    } catch (error) {
      console.error('Error getting tables:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('db/schema/tables/permission/:tableName')
  @ApiAdmin()
  async getTablePermission(@Param('tableName') tableName: string) {
    try {
      return await this.forgeApiService
        .getDatabaseService()
        .getTableSchemaWithPermissions(tableName);
    } catch (error) {
      console.error('Error getting table permission:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('db/schema/tables/:tableName')
  @ApiAdmin()
  async getTableSchema(@Param('tableName') tableName: string) {
    try {
      return await this.forgeApiService
        .getDatabaseService()
        .getTableSchema(tableName);
    } catch (error) {
      console.error('Error getting table schema:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('db/schema/tables/:tableName')
  @ApiAdmin()
  async deleteTable(@Param('tableName') tableName: string) {
    try {
      return await this.forgeApiService
        .getDatabaseService()
        .deleteSchema(tableName);
    } catch (error) {
      console.error('Error deleting table:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('db/schema')
  @ApiAdmin()
  async createSchema(@Body() body: { tableName: string; columns: any[] }) {
    try {
      const { tableName, columns } = body;
      return await this.forgeApiService
        .getDatabaseService()
        .createSchema(tableName, columns);
    } catch (error) {
      console.error('Error creating schema:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('db/schema/column')
  @ApiAdmin()
  async addColumn(@Body() body: { tableName: string; columns: any[] }) {
    try {
      const { tableName, columns } = body;
      return await this.forgeApiService
        .getDatabaseService()
        .addColumn(tableName, columns);
    } catch (error) {
      console.error('Error adding column:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('db/schema/column')
  @ApiAdmin()
  async deleteColumn(@Body() body: { tableName: string; columns: any[] }) {
    try {
      const { tableName, columns } = body;
      return await this.forgeApiService
        .getDatabaseService()
        .deleteColumn(tableName, columns);
    } catch (error) {
      console.error('Error deleting column:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('db/schema/column')
  @ApiAdmin()
  async updateColumn(@Body() body: { tableName: string; columns: any[] }) {
    try {
      const { tableName, columns } = body;
      return await this.forgeApiService
        .getDatabaseService()
        .updateColumn(tableName, columns);
    } catch (error) {
      console.error('Error updating column:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('db/schema/foreign_key')
  @ApiAdmin()
  async addForeignKey(@Body() body: { tableName: string; foreignKey: any }) {
    try {
      const { tableName, foreignKey } = body;
      return await this.forgeApiService
        .getDatabaseService()
        .addForeignKey(tableName, foreignKey);
    } catch (error) {
      console.error('Error adding foreign key:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('db/schema/foreign_key')
  @ApiAdmin()
  async dropForeignKey(@Body() body: { tableName: string; column: string }) {
    try {
      const { tableName, column } = body;
      return await this.forgeApiService
        .getDatabaseService()
        .dropForeignKey(tableName, column);
    } catch (error) {
      console.error('Error dropping foreign key:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('db/schema/truncate')
  @ApiAdmin()
  async truncateTable(@Body() body: { tableName: string }) {
    try {
      const { tableName } = body;
      return await this.forgeApiService
        .getDatabaseService()
        .truncateTable(tableName);
    } catch (error) {
      console.error('Error truncating table:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('db/schema/permissions/:tableName')
  @ApiAdmin()
  async getPermissions(@Param('tableName') tableName: string) {
    try {
      return await this.forgeApiService
        .getDatabaseService()
        .getPermissions(tableName);
    } catch (error) {
      console.error('Error getting permissions:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('db/schema/permissions/:tableName')
  @ApiAdmin()
  async setPermissions(
    @Param('tableName') tableName: string,
    @Body() body: any,
  ) {
    try {
      let permissions = body;
      // Check if permissions is a string, then convert to object
      if (typeof permissions === 'string') {
        permissions = JSON.parse(permissions);
      }
      if (!permissions || typeof permissions !== 'object') {
        throw new HttpException(
          'Invalid permissions provided',
          HttpStatus.BAD_REQUEST,
        );
      }
      return await this.forgeApiService
        .getDatabaseService()
        .setPermissions(tableName, permissions);
    } catch (error) {
      console.error('Error setting permissions:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Database endpoints
  @Post('db/create/:tableName')
  @ApiPublic()
  async createItem(
    @Param('tableName') tableName: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    try {
      let { data } = body;

      // Check if data is an object, then convert to object
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }

      if (!data || typeof data !== 'object') {
        throw new HttpException(
          'Invalid data provided',
          HttpStatus.BAD_REQUEST,
        );
      }

      const id = await this.forgeApiService.getDatabaseService().insert(
        tableName,
        {
          tableName: tableName,
          data,
        },
        req['userContext'],
        req['isSystem'],
      );

      return { id };
    } catch (error) {
      console.error('Error creating item:', error);
      if (error instanceof AuthenticationRequiredError) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      } else if (error instanceof PermissionDeniedError) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      } else {
        throw new HttpException(
          error.message || 'Internal server error',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  @Post('db/query/:tableName')
  @ApiPublic()
  async queryItems(
    @Param('tableName') tableName: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    try {
      const { query } = body;
      return await this.forgeApiService
        .getDatabaseService()
        .query(tableName, query, req['userContext'], req['isSystem']);
    } catch (error) {
      console.error('Error querying items:', error);
      if (error instanceof AuthenticationRequiredError) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      } else if (error instanceof PermissionDeniedError) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      } else {
        throw new HttpException(
          error.message || 'Internal server error',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  @Post('db/query/:tableName/:id')
  @ApiPublic()
  async getItemById(
    @Param('tableName') tableName: string,
    @Param('id') id: string | number,
    @Req() req: Request,
  ) {
    try {
      // Check if id is a number, then convert to number
      const itemId = id;

      const query: DataQueryParams = { filter: { id: itemId }, select: ['*'] };
      return await this.forgeApiService
        .getDatabaseService()
        .query(tableName, query, req['userContext'], req['isSystem']);
    } catch (error) {
      console.error('Error getting item by id:', error);
      if (error instanceof AuthenticationRequiredError) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      } else if (error instanceof PermissionDeniedError) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      } else {
        throw new HttpException(
          error.message || 'Internal server error',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  @Post('db/update/:tableName/:id')
  @ApiPublic()
  async updateItem(
    @Param('tableName') tableName: string,
    @Param('id') id: string | number,
    @Body() body: any,
    @Req() req: Request,
  ) {
    try {
      let { data } = body;
      const itemId = id;

      // Check if data is an object, then convert to object
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }

      const params: DataMutationParams = {
        tableName: tableName,
        data: data,
        id: itemId,
      };

      await this.forgeApiService
        .getDatabaseService()
        .update(params, req['userContext'], req['isSystem']);
      return { success: true };
    } catch (error) {
      console.error('Error updating item:', error);
      if (error instanceof AuthenticationRequiredError) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      } else if (error instanceof PermissionDeniedError) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      } else {
        throw new HttpException(
          error.message || 'Internal server error',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  @Post('db/update/:tableName')
  @ApiPublic()
  async updateItems(
    @Param('tableName') tableName: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    try {
      let { data, query } = body;

      // Check if data is an object, then convert to object
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }

      if (typeof query === 'string') {
        query = JSON.parse(query);
      }

      const params: AdvanceDataMutationParams = {
        tableName: tableName,
        data: data,
        query,
      };

      await this.forgeApiService
        .getDatabaseService()
        .advanceUpdate(params, req['userContext'], req['isSystem']);
      return { success: true };
    } catch (error) {
      console.error('Error updating item:', error);
      if (error instanceof AuthenticationRequiredError) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      } else if (error instanceof PermissionDeniedError) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      } else {
        throw new HttpException(
          error.message || 'Internal server error',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  @Post('db/del/:tableName/:id')
  @ApiPublic()
  async deleteItem(
    @Param('tableName') tableName: string,
    @Param('id') id: string | number,
    @Req() req: Request,
  ) {
    try {
      const itemId = id;

      const data = await this.forgeApiService
        .getDatabaseService()
        .delete(tableName, itemId, req['userContext'], req['isSystem']);
      return { success: true, data };
    } catch (error) {
      console.error('Error deleting item:', error);
      if (error instanceof AuthenticationRequiredError) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      } else if (error instanceof PermissionDeniedError) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      } else {
        throw new HttpException(
          error.message || 'Internal server error',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  @Post('db/del/:tableName')
  @ApiPublic()
  async deleteItems(
    @Param('tableName') tableName: string,
    @Body('query') query: any,
    @Req() req: Request,
  ) {
    try {
      const data = await this.forgeApiService
        .getDatabaseService()
        .advanceDelete(
          {
            tableName,
            query,
          },
          req['userContext'],
          req['isSystem'],
        );
      return { success: true, data };
    } catch (error) {
      console.error('Error deleting item:', error);
      if (error instanceof AuthenticationRequiredError) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      } else if (error instanceof PermissionDeniedError) {
        throw new HttpException(error.message, HttpStatus.FORBIDDEN);
      } else {
        throw new HttpException(
          error.message || 'Internal server error',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }
}
