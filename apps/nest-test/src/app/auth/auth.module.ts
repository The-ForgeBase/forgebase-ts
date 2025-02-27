import { Module } from '@nestjs/common';
import { AuthConfigService } from './auth.config.service';
import { NestAuthModule } from '@forgebase-ts/auth';
import { db } from '../app.module';

@Module({
  imports: [
    NestAuthModule.forRootAsync({
      useFactory: async (authConfigService: AuthConfigService) => {
        const authManager = await authConfigService.initialize(db);
        return {
          authManager,
          config: {
            loginPath: '/auth/login',
            registerPath: '/auth/register',
            logoutPath: '/auth/logout',
          },
        };
      },
      inject: [AuthConfigService],
    }),
  ],
  providers: [AuthConfigService],
  exports: [AuthConfigService],
})
export class AuthModule {}