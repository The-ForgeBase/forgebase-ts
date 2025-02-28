import { Module, DynamicModule, Provider } from '@nestjs/common';
import { BaaSConfig } from '../../types';
import { DatabaseService } from '../database';
import { StorageService } from '../storage';
import { ForgeApiController } from './forge-api.controller';
import { ForgeApiService } from './forge-api.service';

@Module({})
export class ForgeApiModule {
  static forRoot(config: Partial<BaaSConfig> = {}): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'FORGE_CONFIG',
        useValue: config,
      },
      ForgeApiService,
      DatabaseService,
      StorageService,
    ];

    return {
      module: ForgeApiModule,
      controllers: [ForgeApiController],
      providers,
      exports: [ForgeApiService, DatabaseService, StorageService],
      global: true,
    };
  }
}
