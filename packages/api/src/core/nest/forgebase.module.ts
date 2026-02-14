import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { DatabaseService } from '../database';
import { BaaSConfig } from '../../types';
import { DataController } from './controllers/data.controller';
import { SchemaController } from './controllers/schema.controller';

@Global()
@Module({})
export class ForgeBaseModule {
  static register(config: BaaSConfig['services']['db']): DynamicModule {
    const databaseServiceProvider: Provider = {
      provide: DatabaseService,
      useFactory: () => {
        return new DatabaseService(config);
      },
    };

    return {
      module: ForgeBaseModule,
      providers: [databaseServiceProvider],
      exports: [databaseServiceProvider],
      controllers: [DataController, SchemaController],
    };
  }
}
