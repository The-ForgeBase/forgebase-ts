import {
  DynamicModule,
  Module,
  ForwardReference,
  Type,
  Abstract,
} from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthGuard } from './guards/auth.guard';
import { AuthService } from './services/auth.service';
import { AdminController } from './controllers/admin.controller';
import { AdminApiKeyController } from './controllers/admin-api-key.controller';
import { AdminGuard } from './guards/admin.guard';
import { AdminService } from './services/admin.service';
import { NestAuthConfig } from '.';
import { AwilixContainer } from 'awilix';
import { AuthCradle } from '../../container';

export interface NestAuthModuleOptions {
  container: AwilixContainer<AuthCradle>;
  config?: NestAuthConfig;
  adminConfig?: NestAuthConfig;
}

export interface NestAuthModuleAsyncOptions {
  useFactory: (
    ...args: unknown[]
  ) => Promise<NestAuthModuleOptions> | NestAuthModuleOptions;
  inject?: Array<
    | Type<unknown>
    | string
    | symbol
    | Abstract<unknown>
    | Type<(...args: unknown[]) => unknown>
  >;
  imports?: Array<
    Type<unknown> | DynamicModule | Promise<DynamicModule> | ForwardReference
  >;
  controllers?: Array<Type<unknown>>;
}

@Module({
  providers: [AuthService, AdminService, AuthGuard, AdminGuard],
  exports: [AuthService, AdminService, AuthGuard, AdminGuard],
})
export class NestAuthModule {
  // static forRoot(options: NestAuthModuleOptions): DynamicModule {
  //   const container = createAuthContainer(options.deps);

  //   return {
  //     module: NestAuthModule,
  //     providers: [
  //       {
  //         provide: 'AUTH_CONTAINER',
  //         useValue: container,
  //       },
  //       {
  //         provide: 'AUTH_CONFIG',
  //         useValue: options.config || {},
  //       },
  //       {
  //         provide: 'ADMIN_CONFIG',
  //         useValue: options.adminConfig || {},
  //       },
  //       AuthService,
  //       AuthGuard,
  //       AdminGuard,
  //       AdminService,
  //     ],
  //     exports: [AuthService, AdminService, AuthGuard, AdminGuard],
  //   };
  // }

  static forRootAsync(options: NestAuthModuleAsyncOptions): DynamicModule {
    return {
      module: NestAuthModule,
      imports: options.imports || [],
      providers: [
        {
          provide: 'AUTH_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: 'AUTH_CONTAINER',
          useFactory: async (authOptions: NestAuthModuleOptions) => {
            return authOptions.container;
          },
          inject: ['AUTH_OPTIONS'],
        },
        {
          provide: 'AUTH_CONFIG',
          useFactory: async (authOptions: NestAuthModuleOptions) => {
            return authOptions.config || {};
          },
          inject: ['AUTH_OPTIONS'],
        },
        {
          provide: 'ADMIN_CONFIG',
          useFactory: async (authOptions: NestAuthModuleOptions) => {
            return authOptions.adminConfig || {};
          },
          inject: ['AUTH_OPTIONS'],
        },
        AuthService,
        AuthGuard,
        AdminGuard,
        AdminService,
      ],
      controllers: options.controllers || [
        AuthController,
        AdminController,
        AdminApiKeyController,
      ],
      exports: [AuthService, AdminService, AuthGuard, AdminGuard],
      global: true,
    };
  }
}
