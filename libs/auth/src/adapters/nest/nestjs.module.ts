import { DynamicModule, Module, ForwardReference, Type } from '@nestjs/common';
import { DynamicAuthManager } from '../../authManager';
import { User } from '../../types';
import { AuthController } from './controllers/auth.controller';
import { AuthGuard } from './guards/auth.guard';
import { AuthService } from './services/auth.service';
import { AdminController } from './controllers/admin.controller';
import { AdminApiKeyController } from './controllers/admin-api-key.controller';
import { AdminGuard } from './guards/admin.guard';
import { AdminService } from './services/admin.service';
import { InternalAdminManager } from '../../admin';
import { JwksController, JwksService, NestAuthConfig } from '.';
import { JoseJwtSessionManager } from '../../session/jose-jwt';

export interface NestAuthModuleOptions {
  authManager: DynamicAuthManager;
  config?: NestAuthConfig;
  adminManager?: InternalAdminManager;
  adminConfig?: NestAuthConfig;
  joseJwtManager?: JoseJwtSessionManager; // Optional, if you want to use JoseJwtManager
}

export interface NestAuthModuleAsyncOptions {
  useFactory: (
    ...args: any[]
  ) => Promise<NestAuthModuleOptions> | NestAuthModuleOptions;
  inject?: any[];
  imports?:
    | any[]
    | Array<
        Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference
      >;
  controllers?: any[];
}

@Module({
  providers: [AuthService, AdminService, AuthGuard, AdminGuard],
  exports: [AuthService, AdminService, AuthGuard, AdminGuard],
})
export class NestAuthModule {
  static forRoot(options: NestAuthModuleOptions): DynamicModule {
    return {
      module: NestAuthModule,
      providers: [
        {
          provide: 'AUTH_MANAGER',
          useValue: options.authManager,
        },
        {
          provide: 'AUTH_CONFIG',
          useValue: options.config || {},
        },
        {
          provide: 'ADMIN_MANAGER',
          useValue: options.adminManager,
        },
        {
          provide: 'ADMIN_CONFIG',
          useValue: options.adminConfig || {},
        },
        AuthService,
        AuthGuard,
        AdminGuard,
        AdminService,
      ],
      exports: [AuthService, AdminService, AuthGuard, AdminGuard],
    };
  }

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
          provide: 'AUTH_MANAGER',
          useFactory: async (authOptions: NestAuthModuleOptions) => {
            return authOptions.authManager;
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
          provide: 'ADMIN_MANAGER',
          useFactory: async (authOptions: NestAuthModuleOptions) => {
            return authOptions.adminManager;
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
      exports: [AuthService, AdminService, AuthGuard, AdminGuard],
    };
  }
}

@Module({})
export class NestAuthModuleWithJWKS {
  static forRootAsync(options: NestAuthModuleAsyncOptions): DynamicModule {
    return {
      module: NestAuthModuleWithJWKS,
      imports: options.imports || [],
      providers: [
        {
          provide: 'AUTH_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: 'AUTH_MANAGER',
          useFactory: async (authOptions: NestAuthModuleOptions) => {
            return authOptions.authManager;
          },
          inject: ['AUTH_OPTIONS'],
        },
        {
          provide: 'JOSE_JWT_MANAGER',
          useFactory: async (authOptions: NestAuthModuleOptions) => {
            return authOptions.joseJwtManager;
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
          provide: 'ADMIN_MANAGER',
          useFactory: async (authOptions: NestAuthModuleOptions) => {
            return authOptions.adminManager;
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
        JwksService,
      ],
      controllers: options.controllers || [
        AuthController,
        AdminController,
        AdminApiKeyController,
        JwksController,
      ],
      exports: [AuthService, AdminService, JwksService, AuthGuard, AdminGuard],
      global: true, // Make the module global to help avoid dependency issues
    };
  }
}
