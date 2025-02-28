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
  Res,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ForgeApiService } from './forge-api.service';
import { DataMutationParams, DataQueryParams } from '@forgebase-ts/database';

@Controller()
export class ForgeApiController {
  constructor(private readonly forgeApiService: ForgeApiService) {}

  // Database endpoints
  @Post('db/:collection')
  async createItem(
    @Param('collection') collection: string,
    @Body() body: any,
    @Req() req: Request
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
          HttpStatus.BAD_REQUEST
        );
      }

      const id = await this.forgeApiService.getDatabaseService().insert(
        collection,
        {
          tableName: collection,
          data,
        },
        (req as any).user
      );

      return { id };
    } catch (error) {
      console.error('Error creating item:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('db/:collection')
  async queryItems(
    @Param('collection') collection: string,
    @Query() query: any,
    @Req() req: Request
  ) {
    try {
      return await this.forgeApiService
        .getDatabaseService()
        .query(collection, query, (req as any).user);
    } catch (error) {
      console.error('Error querying items:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('db/:collection/:id')
  async getItemById(
    @Param('collection') collection: string,
    @Param('id') id: string | number,
    @Req() req: Request
  ) {
    try {
      // Check if id is a number, then convert to number
      let itemId = id;

      const query: DataQueryParams = { filter: { id: itemId }, select: ['*'] };
      return await this.forgeApiService
        .getDatabaseService()
        .query(collection, query, (req as any).user);
    } catch (error) {
      console.error('Error getting item by id:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('db/:collection/:id')
  async updateItem(
    @Param('collection') collection: string,
    @Param('id') id: string | number,
    @Body() body: any,
    @Req() req: Request
  ) {
    try {
      let { data } = body;
      let itemId = id;

      // Check if data is an object, then convert to object
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }

      const params: DataMutationParams = {
        tableName: collection,
        data: data,
        id: itemId,
      };

      await this.forgeApiService
        .getDatabaseService()
        .update(params, (req as any).user);
      return { success: true };
    } catch (error) {
      console.error('Error updating item:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('db/:collection/:id')
  async deleteItem(
    @Param('collection') collection: string,
    @Param('id') id: string | number,
    @Req() req: Request
  ) {
    try {
      let itemId = id;

      await this.forgeApiService
        .getDatabaseService()
        .delete(collection, itemId, (req as any).user);
      return { success: true };
    } catch (error) {
      console.error('Error deleting item:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('db/schema')
  async getSchema() {
    try {
      return await this.forgeApiService.getDatabaseService().getSchema();
    } catch (error) {
      console.error('Error getting schema:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('db/schema')
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
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('db/schema/column')
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
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('db/schema/column')
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
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('db/schema/column')
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
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('db/schema/foreign_key')
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
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('db/schema/foreign_key')
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
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('db/schema/truncate')
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
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('db/schema/permissions/:tableName')
  async getPermissions(@Param('tableName') tableName: string) {
    try {
      return await this.forgeApiService
        .getDatabaseService()
        .getPermissions(tableName);
    } catch (error) {
      console.error('Error getting permissions:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('db/schema/permissions/:tableName')
  async setPermissions(
    @Param('tableName') tableName: string,
    @Body() body: { permissions: any }
  ) {
    try {
      const { permissions } = body;
      return await this.forgeApiService
        .getDatabaseService()
        .setPermissions(tableName, permissions);
    } catch (error) {
      console.error('Error setting permissions:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
