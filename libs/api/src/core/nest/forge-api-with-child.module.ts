import { Module, DynamicModule, Provider, Inject, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { BaaSConfig } from '../../types';
import { DatabaseService } from '../database';
import { StorageService } from '../storage';
import { ForgeApiController } from './forge-api.controller';
import { ForgeApiService } from './forge-api.service';

export interface ForgeApiModuleOptions {
  prefix?: string;
  routes?: string[];
}

@Module({})
export class ForgeApiWithChildModule implements NestModule {
  private routeName: string;

  constructor(@Inject('FORGE_OPTIONS') private options: ForgeApiModuleOptions) {
    this.routeName = options.prefix || 'api/*';
  }

  static forRoot(config: Partial<BaaSConfig> = {}): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'FORGE_CONFIG',
        useValue: config,
      },
      {
        provide: 'FORGE_OPTIONS',
        useValue: {
          prefix: config.prefix,
        },
      },
      ForgeApiService,
      DatabaseService,
      StorageService,
    ];

    return {
      module: ForgeApiWithChildModule,
      controllers: [ForgeApiController],
      providers,
      exports: [ForgeApiService, DatabaseService, StorageService, 'FORGE_CONFIG'],
      global: true,
    };
  }

  static forChild(config: Partial<BaaSConfig> = {}): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'FORGE_CONFIG',
        useValue: config,
      },
      {
        provide: 'FORGE_OPTIONS',
        useValue: {
          prefix: config.prefix,
        },
      },
      ForgeApiService,
      DatabaseService,
      StorageService,
    ];

    return {
      module: ForgeApiWithChildModule,
      controllers: [ForgeApiController],
      providers,
      exports: [ForgeApiService, DatabaseService, StorageService],
      // Not global for child modules to avoid conflicts
    };
  }

  configure(consumer: MiddlewareConsumer) {
    // If you need to apply middleware to specific routes
    // const routes = this.options.routes || [this.routeName];
    // consumer.apply(YourMiddleware).forRoutes(...routes);
  }
}