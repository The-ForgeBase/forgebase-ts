import { AuthFrameworkAdapter } from '../adapters/framework';

export type MiddlewareNext = () => Promise<void>;
export type MiddlewareContext = {
  req: unknown;
  res: unknown;
  auth: {
    userId?: string;
    sessionId?: string;
    [key: string]: any;
  };
};
export type Middleware = (
  ctx: MiddlewareContext,
  next: MiddlewareNext
) => Promise<void>;

export class MiddlewareManager {
  private middleware: Middleware[] = [];

  use(fn: Middleware): this {
    this.middleware.push(fn);
    return this;
  }

  createHandler(adapter: AuthFrameworkAdapter) {
    return async (req: unknown, res: unknown) => {
      const ctx: MiddlewareContext = {
        req,
        res,
        auth: {},
      };

      let index = 0;
      const runner = async (): Promise<void> => {
        const middleware = this.middleware[index++];
        if (middleware) {
          await middleware(ctx, runner);
        }
      };

      try {
        await runner();
      } catch (error) {
        const authError = adapter.createError(500, error.message);
        throw authError;
      }

      return ctx;
    };
  }
}
