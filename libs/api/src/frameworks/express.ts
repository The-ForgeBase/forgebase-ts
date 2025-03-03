import { BaaSConfig, forgeApi } from '@forgebase-ts/api';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ExpressAdapter } from '../adapters';

export interface ForgeExpressOptions {
  prefix?: string;
  routes?: string[];
}

export function forgeExpressMiddleware(config: Partial<BaaSConfig>): RequestHandler {
  const api = forgeApi(config);

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adapter = new ExpressAdapter(req);
      const handled = await api.handle(adapter);

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
  };
}