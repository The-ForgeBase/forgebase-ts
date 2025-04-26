import { Module } from '@nestjs/common';
import { AuthConfigService } from './auth.config.service';

@Module({
  providers: [AuthConfigService],
  exports: [AuthConfigService],
})
export class AuthConfigModule {}
