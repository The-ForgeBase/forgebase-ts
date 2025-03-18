import { DynamicModule, Module, ForwardReference, Type } from '@nestjs/common';
import { DynamicAuthManager } from '../../authManager';
import { User } from '../../types';
import { AuthController } from './controllers/auth.controller';
import { AuthGuard } from './guards/auth.guard';
import { AuthService } from './services/auth.service';
import { AdminController } from './controllers/admin.controller';
import { AdminGuard } from './guards/admin.guard';
import { AdminService } from './services/admin.service';
import { InternalAdminManager } from '../../admin';
import { JwksController, JwksService, NestAuthConfig } from '.';
import { JoseJwtSessionManager } from '../../session/jose-jwt';

export interface NestAuthModuleOptions<TUser extends User> {
  authManager: DynamicAuthManager<TUser>;
  config?: NestAuthConfig;
  adminManager?: InternalAdminManager;
  adminConfig?: NestAuthConfig;
  joseJwtManager?: JoseJwtSessionManager; // Optional, if you want to use JoseJwtManager
}

export interface NestAuthModuleAsyncOptions<TUser extends User> {
  useFactory: (
    ...args: any[]
  ) => Promise<NestAuthModuleOptions<TUser>> | NestAuthModuleOptions<TUser>;
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
  static forRoot<TUser extends User>(
    options: NestAuthModuleOptions<TUser>
  ): DynamicModule {
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

  static forRootAsync<TUser extends User>(
    options: NestAuthModuleAsyncOptions<TUser>
  ): DynamicModule {
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
          useFactory: async (authOptions: NestAuthModuleOptions<TUser>) => {
            return authOptions.authManager;
          },
          inject: ['AUTH_OPTIONS'],
        },
        {
          provide: 'AUTH_CONFIG',
          useFactory: async (authOptions: NestAuthModuleOptions<TUser>) => {
            return authOptions.config || {};
          },
          inject: ['AUTH_OPTIONS'],
        },
        {
          provide: 'ADMIN_MANAGER',
          useFactory: async (authOptions: NestAuthModuleOptions<TUser>) => {
            return authOptions.adminManager;
          },
          inject: ['AUTH_OPTIONS'],
        },
        {
          provide: 'ADMIN_CONFIG',
          useFactory: async (authOptions: NestAuthModuleOptions<TUser>) => {
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
  static forRootAsync<TUser extends User>(
    options: NestAuthModuleAsyncOptions<TUser>
  ): DynamicModule {
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
          useFactory: async (authOptions: NestAuthModuleOptions<TUser>) => {
            return authOptions.authManager;
          },
          inject: ['AUTH_OPTIONS'],
        },
        {
          provide: 'JOSE_JWT_MANAGER',
          useFactory: async (authOptions: NestAuthModuleOptions<TUser>) => {
            return authOptions.joseJwtManager;
          },
          inject: ['AUTH_OPTIONS'],
        },
        {
          provide: 'AUTH_CONFIG',
          useFactory: async (authOptions: NestAuthModuleOptions<TUser>) => {
            return authOptions.config || {};
          },
          inject: ['AUTH_OPTIONS'],
        },
        {
          provide: 'ADMIN_MANAGER',
          useFactory: async (authOptions: NestAuthModuleOptions<TUser>) => {
            return authOptions.adminManager;
          },
          inject: ['AUTH_OPTIONS'],
        },
        {
          provide: 'ADMIN_CONFIG',
          useFactory: async (authOptions: NestAuthModuleOptions<TUser>) => {
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
      controllers:
        options.controllers ||
        [
          // AuthController,
          // AdminController,
          // JwksController,
        ],
      exports: [AuthService, AdminService, JwksService, AuthGuard, AdminGuard],
      global: true, // Make the module global to help avoid dependency issues
    };
  }
}
