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
      {
        provide: DatabaseService,
        useFactory: (config: Partial<BaaSConfig>) => {
          return new DatabaseService(config?.services?.db);
        },
        inject: ['FORGE_CONFIG'],
      },
      {
        provide: StorageService,
        useFactory: (config: Partial<BaaSConfig>) => {
          return new StorageService(config?.services?.storage);
        },
        inject: ['FORGE_CONFIG'],
      },
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
