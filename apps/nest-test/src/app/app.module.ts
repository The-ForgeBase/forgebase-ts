import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ForgeNestApiModule } from '@forgebase-ts/api';

@Module({
  imports: [ForgeNestApiModule.forRoot({
    prefix: '/api',
    services: {
      db: {
        provider: 'sqlite',
        realtime: false,
        enforceRls: false,
        config: {
          filename: './database.sqlite',
        },
      },
      storage: {
        provider: 'local',
        config: {},
      },
    },
  })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
