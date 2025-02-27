import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ForgeApi } from '../../core/api';
import { NestAdapter } from '../../adapters';

@Injectable()
export class ForgeBaseMiddleware implements NestMiddleware {
  constructor(private readonly api: ForgeApi) {}

  async use(req: Request, res: Response, next: NextFunction) {
   try {
     const adapter = new NestAdapter(req);
     const handled = await this.api.handle(adapter);
     
     if (!handled) {
       next();
       return;
     }

     if (handled.context.res.body !== null) {
        // Set any custom headers from the ForgeBase response
        if (handled.context.res.headers) {
          Object.entries(handled.context.res.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
          });
        }
        res.status(handled.context.res.status).json(handled.context.res.body);
      } else {
        next();
      }
   } catch (error) {
     next(error);
   }
  }
}
