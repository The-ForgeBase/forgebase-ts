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

// you can have multiple ForgeBase instances in your NestJS application. The forChild() method in ForgeNestApiModule allows you to create additional ForgeBase instances with different route configurations while sharing the core API instance created by forRoot(). Each child module can have its own route prefix and configuration, making it possible to organize your API endpoints into separate logical groups within the same NestJS application.

@Module({})
export class ForgeNestApiModuleWithChildV1 implements NestModule {
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
      module: ForgeNestApiModuleWithChildV1,
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

  static forChild(options: ForgeNestModuleOptions = {}): DynamicModule {
    return {
      module: ForgeNestApiModuleWithChildV1,
      providers: [
        {
          provide: 'FORGE_OPTIONS',
          useValue: options,
        },
      ],
    };
  }

  configure(consumer: MiddlewareConsumer) {
    const routes = this.options.routes || [this.routeName];
    consumer.apply(ForgeBaseMiddleware).forRoutes(...routes);
  }
}
