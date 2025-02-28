import { DynamicModule, Module } from '@nestjs/common';
import { DynamicAuthManager } from '../../authManager';
import { NestAuthConfig } from '../nestjs';
import { User } from '../../types';
import { AuthController } from './controllers/auth.controller';
import { AuthGuard } from './guards/auth.guard';
import { AuthService } from './services/auth.service';

export interface NestAuthModuleOptions<TUser extends User> {
  authManager: DynamicAuthManager<TUser>;
  config?: NestAuthConfig;
}

export interface NestAuthModuleAsyncOptions<TUser extends User> {
  useFactory: (
    ...args: any[]
  ) => Promise<NestAuthModuleOptions<TUser>> | NestAuthModuleOptions<TUser>;
  inject?: any[];
  imports?: any[];
}

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [AuthService, AuthGuard],
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
        AuthService,
        AuthGuard,
      ],
      controllers: [AuthController],
      exports: [AuthService, AuthGuard],
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
        AuthService,
        AuthGuard,
      ],
      controllers: [AuthController],
      exports: [AuthService, AuthGuard],
    };
  }
}
