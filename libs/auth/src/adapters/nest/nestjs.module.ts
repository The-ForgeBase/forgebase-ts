import { DynamicModule, Module } from '@nestjs/common';
import { DynamicAuthManager } from '../../authManager';
import { User } from '../../types';
import { AuthController } from './controllers/auth.controller';
import { AuthGuard } from './guards/auth.guard';
import { AuthService } from './services/auth.service';
import { AdminController } from './controllers/admin.controller';
import { AdminGuard } from './guards/admin.guard';
import { AdminService } from './services/admin.service';
import { InternalAdminManager } from '../../admin';
import { NestAuthConfig } from '..';

export interface NestAuthModuleOptions<TUser extends User> {
  authManager: DynamicAuthManager<TUser>;
  config?: NestAuthConfig;
  adminManager?: InternalAdminManager;
  adminConfig?: NestAuthConfig;
}

export interface NestAuthModuleAsyncOptions<TUser extends User> {
  useFactory: (
    ...args: any[]
  ) => Promise<NestAuthModuleOptions<TUser>> | NestAuthModuleOptions<TUser>;
  inject?: any[];
  imports?: any[];
}

@Module({
  controllers: [AuthController, AdminController],
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
      controllers: [AuthController, AdminController],
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
      controllers: [AuthController, AdminController],
      exports: [AuthService, AdminService, AuthGuard, AdminGuard],
    };
  }
}
