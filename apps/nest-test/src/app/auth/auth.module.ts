import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthConfigService } from './auth.config.service';
import {
  AdminController,
  AuthController,
  NestAuthModule,
  NestAuthModuleOptions,
} from '@forgebase-ts/auth/adapters/nest';
import { db } from '../app.module';
import { AuthInterceptor } from './interceptors/auth.interceptor';

@Module({
  imports: [
    NestAuthModule.forRootAsync({
      useFactory: async (
        authConfigService: AuthConfigService
      ): Promise<NestAuthModuleOptions> => {
        const container = await authConfigService.initialize(db);
        // console.log('AuthModule: Initialization complete');
        return {
          container,
          adminConfig: {
            basePath: '/admin',
            cookieName: 'admin_token',
            cookieOptions: {
              httpOnly: false,
              secure: false,
              maxAge: 3600,
              sameSite: 'lax',
            },
          },
          config: {
            basePath: '/auth',
            cookieName: 'auth_token',
            cookieOptions: {
              httpOnly: false,
              secure: false,
              maxAge: 3600,
              sameSite: 'lax',
            },
          },
        };
      },
      inject: [AuthConfigService],
      imports: [AuthModule],
      controllers: [AuthController, AdminController],
    }),
  ],
  providers: [
    AuthConfigService,
    {
      provide: APP_INTERCEPTOR,
      useFactory: (authConfigService: AuthConfigService) => {
        return new AuthInterceptor(authConfigService);
      },
      inject: [AuthConfigService],
    },
  ],
  exports: [AuthConfigService],
})
export class AuthModule {}
