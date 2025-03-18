import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ForgeApiModule } from '@forgebase-ts/api/core/nest';
import { AuthModule } from './auth/auth.module';
import knex from 'knex';
import { NestModule, MiddlewareConsumer } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

// Cookie logger middleware
export class CookieLoggerMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    console.log('Request cookies:', req.cookies);
    next();
  }
}

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
          config: {},
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
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // consumer.apply(CookieLoggerMiddleware).forRoutes('*'); // Apply to all routes
  }
}
