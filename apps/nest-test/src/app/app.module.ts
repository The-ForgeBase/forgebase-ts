import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ForgeApiModule } from '@forgebase-ts/api/core/nest';
import { AuthModule } from './auth/auth.module';
import { AdminMiddleware } from '@forgebase-ts/auth/adapters/nest/middlewares/admin.middleware';
import knex from 'knex';
import { AuthTables } from '@forgebase-ts/auth';
import { SSEModule } from './sse/sse.module';

export const db = knex({
  client: 'sqlite3',
  connection: {
    filename: './db.sqlite',
  },
  useNullAsDefault: true,
  pool: {
    min: 0,
    max: 10,
    acquireTimeoutMillis: 60000, // 60 seconds
    createTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
  },
});

@Module({
  imports: [
    ForgeApiModule.forRoot({
      prefix: '/api',
      // api: {
      //   adminReqName: 'admin',
      // },
      services: {
        db: {
          provider: 'sqlite',
          config: {
            realtime: true,
            enforceRls: true,
            excludedTables: [...AuthTables],
            db,
          },
        },
        storage: {
          provider: 'local',
          config: {},
        },
      },
    }),
    AuthModule,
    SSEModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply AdminMiddleware globally to all routes
    consumer.apply(AdminMiddleware).forRoutes('*');
    // AuthMiddleware removed in favor of AuthInterceptor
  }
}
