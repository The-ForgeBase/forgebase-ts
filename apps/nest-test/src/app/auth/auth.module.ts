import { Module } from '@nestjs/common';
import { AuthConfigService } from './auth.config.service';
import { NestAuthModule } from '@forgebase-ts/auth/adapters/nest';
import { db } from '../app.module';

@Module({
  imports: [
    NestAuthModule.forRootAsync({
      useFactory: async (authConfigService: AuthConfigService) => {
        const { authManager, adminManager } =
          await authConfigService.initialize(db);
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
        };
      },
      inject: [AuthConfigService],
      imports: [AuthModule], // Include AuthModule to make AuthConfigService available
    }),
  ],
  providers: [AuthConfigService],
  exports: [AuthConfigService],
})
export class AuthModule {}
