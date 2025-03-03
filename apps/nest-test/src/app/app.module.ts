import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { ForgeNestApiModule } from '@forgebase-ts/api/frameworks/nest';
import { ForgeApiModule } from '@forgebase-ts/api/core/nest';
import { AuthModule } from './auth/auth.module';
import knex from 'knex';

export const db = knex({
  client: 'sqlite3',
  connection: {
    filename: ':memory:',
  },
  useNullAsDefault: true,
});

@Module({
  imports: [
    ForgeApiModule.forRoot({
      prefix: '/api',
      services: {
        db: {
          provider: 'sqlite',
          realtime: false,
          enforceRls: false,
          config: {
            filename: './database.sqlite',
          },
          knex: db,
        },
        storage: {
          provider: 'local',
          config: {},
        },
      },
    }),
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
