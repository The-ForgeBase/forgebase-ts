import { Module } from '@nestjs/common';
import { SSEController } from './sse.controller';
import { SSEService } from './sse.service';
import { SSETestController } from './sse-test.controller';
import { TableSetupService } from './table-setup.service';

@Module({
  controllers: [SSEController, SSETestController],
  providers: [SSEService],
  exports: [SSEService],
})
export class SSEModule {}
