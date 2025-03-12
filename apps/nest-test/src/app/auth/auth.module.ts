import { Module } from '@nestjs/common';
import { AuthConfigService } from './auth.config.service';
import {
  AdminController,
  AuthController,
  JwksController,
  NestAuthModuleWithJWKS,
} from '@forgebase-ts/auth/adapters/nest';
import { db } from '../app.module';
import { CustomJwksController } from './jwks/custom-jwks.controller';

@Module({
  imports: [
    NestAuthModuleWithJWKS.forRootAsync({
      useFactory: async (authConfigService: AuthConfigService) => {
        const { authManager, adminManager, joseJwtManager } =
          await authConfigService.initialize(db);
        console.log('AuthModule: Initialization complete');
        return {
          authManager,
          adminManager,
          adminConfig: {
            basePath: '/admin',
            cookieName: 'admin_token',
          },
          config: {
            basePath: '/auth',
            cookieName: 'auth_token',
          },
          joseJwtManager,
        };
      },
      inject: [AuthConfigService],
      imports: [AuthModule], // Include AuthModule to make AuthConfigService available
    }),
  ],
  providers: [AuthConfigService],
  controllers: [
    AuthController,
    AdminController,
    JwksController,
    CustomJwksController,
  ],
  exports: [AuthConfigService],
})
export class AuthModule {}
