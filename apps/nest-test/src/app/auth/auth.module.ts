import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthConfigService } from './auth.config.service';
import {
  AdminController,
  AuthController,
  JwksController,
  NestAuthModuleWithJWKS,
} from '@forgebase-ts/auth/adapters/nest';
import { db } from '../app.module';
import { CustomJwksController } from './jwks/custom-jwks.controller';
import { AuthInterceptor } from './interceptors/auth.interceptor';

@Module({
  imports: [
    NestAuthModuleWithJWKS.forRootAsync({
      useFactory: async (authConfigService: AuthConfigService) => {
        const { authManager, adminManager, joseJwtManager } =
          await authConfigService.initialize(db);
        // console.log('AuthModule: Initialization complete');
        return {
          authManager,
          adminManager,
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
          joseJwtManager,
        };
      },
      inject: [AuthConfigService],
      imports: [AuthModule],
      controllers: [AuthController, AdminController, JwksController],
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
  controllers: [CustomJwksController],
  exports: [AuthConfigService],
})
export class AuthModule {}
