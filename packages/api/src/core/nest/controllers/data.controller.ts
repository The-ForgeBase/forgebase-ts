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

  @Post(':table/query')
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

  @Post(':table')
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

  @Patch(':table')
  async update(@Body() params: DataMutationParams, @Req() req: any) {
    return this.databaseService.update(params, req.userContext, req.isSystem);
  }

  @Post('advance-update')
  async advanceUpdate(
    @Body() params: AdvanceDataMutationParams,
    @Req() req: any,
  ) {
    return this.databaseService.advanceUpdate(
      params,
      req.userContext,
      req.isSystem,
    );
  }

  @Delete(':table/:id')
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

  @Post('advance-delete')
  async advanceDelete(
    @Body() params: AdvanceDataDeleteParams,
    @Req() req: any,
  ) {
    return this.databaseService.advanceDelete(
      params,
      req.userContext,
      req.isSystem,
    );
  }
}
