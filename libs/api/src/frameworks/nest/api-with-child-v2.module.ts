import { BaaSConfig } from '../../types';
import { forgeApi } from '../../index';
import {
  DynamicModule,
  Module,
  MiddlewareConsumer,
  NestModule,
  Inject,
} from '@nestjs/common';
import { ForgeBaseMiddleware } from './middleware.adapter';

export interface ForgeNestModuleOptions {
  prefix?: string;
  routes?: string[];
}

/// the ForgeNestApiModule's forChild method to create a new ForgeApi instance with its own configuration. This change allows each feature module to have its own isolated ForgeBase instance with different configurations and route prefixes.

@Module({})
export class ForgeNestApiModuleWithChildV2 implements NestModule {
  private routeName: string;

  constructor(
    @Inject('FORGE_OPTIONS') private options: ForgeNestModuleOptions
  ) {
    this.routeName = options.prefix || 'api/*';
  }

  static forRoot(config: Partial<BaaSConfig>): DynamicModule {
    const api = forgeApi(config);
    const options: ForgeNestModuleOptions = {
      prefix: config.prefix,
    };

    return {
      module: ForgeNestApiModuleWithChildV2,
      providers: [
        {
          provide: 'FORGE_API',
          useValue: api,
        },
        {
          provide: 'FORGE_OPTIONS',
          useValue: options,
        },
      ],
      exports: ['FORGE_API'],
      global: true,
    };
  }

  static forChild(config: Partial<BaaSConfig>): DynamicModule {
    const api = forgeApi(config);
    const options: ForgeNestModuleOptions = {
      prefix: config.prefix,
    };

    return {
      module: ForgeNestApiModuleWithChildV2,
      providers: [
        {
          provide: 'FORGE_API',
          useValue: api,
        },
        {
          provide: 'FORGE_OPTIONS',
          useValue: options,
        },
      ],
      exports: ['FORGE_API'],
    };
  }

  configure(consumer: MiddlewareConsumer) {
    const routes = this.options.routes || [this.routeName];
    consumer.apply(ForgeBaseMiddleware).forRoutes(...routes);
  }
}
