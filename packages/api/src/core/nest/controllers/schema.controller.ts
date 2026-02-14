import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { DatabaseService } from '../../database';
import type {
  ColumnDefinition,
  ForeignKey,
  UpdateColumnDefinition,
} from '@the-forgebase/database';

@Controller('schema')
export class SchemaController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get()
  async getSchema() {
    return this.databaseService.getSchema();
  }

  @Get('tables')
  async getTables() {
    return this.databaseService.getTables();
  }

  @Get(':table')
  async getTableSchema(@Param('table') table: string) {
    return this.databaseService.getTableSchema(table);
  }

  @Get(':table/permissions')
  async getTableSchemaWithPermissions(@Param('table') table: string) {
    return this.databaseService.getTableSchemaWithPermissions(table);
  }

  @Post(':table')
  async createSchema(
    @Param('table') table: string,
    @Body() columns: ColumnDefinition[],
  ) {
    return this.databaseService.createSchema(table, columns);
  }

  @Delete(':table')
  async deleteSchema(@Param('table') table: string) {
    return this.databaseService.deleteSchema(table);
  }

  @Post(':table/column')
  async addColumn(
    @Param('table') table: string,
    @Body() columns: ColumnDefinition[] | UpdateColumnDefinition[],
  ) {
    return this.databaseService.addColumn(table, columns);
  }

  @Delete(':table/column')
  async deleteColumn(
    @Param('table') table: string,
    @Body() columns: ColumnDefinition[] | UpdateColumnDefinition[],
  ) {
    return this.databaseService.deleteColumn(table, columns);
  }

  @Put(':table/column')
  async updateColumn(
    @Param('table') table: string,
    @Body() columns: UpdateColumnDefinition[],
  ) {
    return this.databaseService.updateColumn(table, columns);
  }

  @Post(':table/foreign-key')
  async addForeignKey(
    @Param('table') table: string,
    @Body() foreignKey: ForeignKey,
  ) {
    return this.databaseService.addForeignKey(table, foreignKey);
  }

  @Delete(':table/foreign-key/:column')
  async dropForeignKey(
    @Param('table') table: string,
    @Param('column') column: string,
  ) {
    return this.databaseService.dropForeignKey(table, column);
  }

  @Post(':table/truncate')
  async truncateTable(@Param('table') table: string) {
    return this.databaseService.truncateTable(table);
  }
}
