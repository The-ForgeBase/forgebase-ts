import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { DatabaseService } from '../../database';
import type {
  AdvanceDataDeleteParams,
  AdvanceDataMutationParams,
  DataMutationParams,
  DataQueryParams,
} from '@forgebase/database';

@Controller('data')
export class DataController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Post('query/:table')
  async query(
    @Param('table') table: string,
    @Body() query: DataQueryParams,
    @Req() req: any,
  ) {
    return this.databaseService.query(
      table,
      query,
      req.userContext,
      req.isSystem,
    );
  }

  @Post('create/:table')
  async insert(
    @Param('table') table: string,
    @Body() data: DataMutationParams,
    @Req() req: any,
  ) {
    return this.databaseService.insert(
      table,
      data,
      req.userContext,
      req.isSystem,
    );
  }

  @Patch('update/:table/:id')
  async update(
    @Param('table') table: string,
    @Param('id') id: string,
    @Body() params: DataMutationParams,
    @Req() req: any,
  ) {
    return this.databaseService.update(
      {
        ...params,
        tableName: table,
        id,
      },
      req.userContext,
      req.isSystem,
    );
  }

  @Post('update/:table')
  async advanceUpdate(
    @Param('table') table: string,
    @Body() params: AdvanceDataMutationParams,
    @Req() req: any,
  ) {
    return this.databaseService.advanceUpdate(
      {
        ...params,
        tableName: table,
      },
      req.userContext,
      req.isSystem,
    );
  }

  @Delete('del/:table/:id')
  async delete(
    @Param('table') table: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.databaseService.delete(
      table,
      id,
      req.userContext,
      req.isSystem,
    );
  }

  @Post('del/:table')
  async advanceDelete(
    @Param('table') table: string,
    @Body() params: AdvanceDataDeleteParams,
    @Req() req: any,
  ) {
    return this.databaseService.advanceDelete(
      {
        ...params,
        tableName: table,
      },
      req.userContext,
      req.isSystem,
    );
  }
}
