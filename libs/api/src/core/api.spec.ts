import { ForgeApi } from './api';
import { Context, Handler, ServerAdapter } from '../types';

class MockServerAdapter implements ServerAdapter {
  constructor(
    private method: string,
    private path: string,
    private body?: any,
    private query: Record<string, string> = {}
  ) {}

  getMethod(): string {
    return this.method;
  }

  getPath(): string {
    return this.path;
  }

  getQuery(): Record<string, string> {
    return this.query;
  }

  getHeaders(): Record<string, string> {
    return {};
  }

  async getBody(): Promise<any> {
    return this.body;
  }

  getUserContext(): Record<string, any> {
    return {};
  }
}

describe('ForgeApi', () => {
  let api: ForgeApi;

  beforeEach(() => {
    api = new ForgeApi({
      prefix: '/api',
      services: {
        db: {
          provider: 'sqlite',
          realtime: false,
          enforceRls: false,
          config: {
            filename: ':memory:',
          },
        },
        storage: {
          provider: 'local',
          config: {},
        },
      },
    });
  });

  describe('Routing', () => {
    it('should handle GET requests', async () => {
      const testHandler: Handler = async (ctx: Context) => {
        ctx.res.body = { message: 'Hello World' };
      };

      api.get('/test', testHandler);

      const adapter = new MockServerAdapter('GET', '/api/test');
      const { context } = await api.handle(adapter);

      expect(context.res.status).toBe(200);
      expect(context.res.body).toEqual({ message: 'Hello World' });
    });

    it('should handle route parameters', async () => {
      const testHandler: Handler = async (ctx: Context) => {
        ctx.res.body = { id: ctx.req.params.id };
      };

      api.get('/test/:id', testHandler);

      const adapter = new MockServerAdapter('GET', '/api/test/123');
      const { context } = await api.handle(adapter);

      expect(context.res.status).toBe(200);
      expect(context.res.body).toEqual({ id: '123' });
    });

    it('should throw error for non-existent routes', async () => {
      const adapter = new MockServerAdapter('GET', '/api/nonexistent');
      
      await expect(api.handle(adapter)).rejects.toThrow('No handler found');
    });
  });

  describe('Middleware', () => {
    it('should execute middleware before route handler', async () => {
      const middleware: Handler = async (ctx: Context) => {
        ctx.req.userContext = { user: 'test' };
      };

      const routeHandler: Handler = async (ctx: Context) => {
        ctx.res.body = ctx.req.userContext;
      };

      api.use(middleware);
      api.get('/test', routeHandler);

      const adapter = new MockServerAdapter('GET', '/api/test');
      const { context } = await api.handle(adapter);

      expect(context.res.body).toEqual({ user: 'test' });
    });

    it('should stop processing if middleware sets response', async () => {
      const middleware: Handler = async (ctx: Context) => {
        ctx.res.body = { blocked: true };
      };

      const routeHandler: Handler = async (ctx: Context) => {
        ctx.res.body = { success: true };
      };

      api.use(middleware);
      api.get('/test', routeHandler);

      const adapter = new MockServerAdapter('GET', '/api/test');
      const { context } = await api.handle(adapter);

      expect(context.res.body).toEqual({ blocked: true });
    });
  });

  describe('Database Routes', () => {
    it('should handle database insert', async () => {
      const testData = { name: 'Test' };
      const adapter = new MockServerAdapter('POST', '/api/db/users', { data: testData });
      
      const { context } = await api.handle(adapter);
      
      expect(context.res.status).toBe(201);
      expect(context.res.body).toHaveProperty('id');
    });

    it('should handle database query', async () => {
      const adapter = new MockServerAdapter('GET', '/api/db/users', null, {
        filter: JSON.stringify({ name: 'Test' })
      });
      
      const { context } = await api.handle(adapter);
      
      expect(context.res.status).toBe(200);
    });
  });

  describe('Storage Routes', () => {
    it('should handle file upload', async () => {
      const fileData = Buffer.from('test file content');
      const adapter = new MockServerAdapter('POST', '/api/storage/public/test.txt', fileData);
      
      const { context } = await api.handle(adapter);
      
      expect(context.res.status).toBe(201);
    });

    it('should handle file download', async () => {
      // First upload a file
      const fileData = Buffer.from('test file content');
      await api.handle(new MockServerAdapter('POST', '/api/storage/public/test.txt', fileData));

      // Then try to download it
      const adapter = new MockServerAdapter('GET', '/api/storage/public/test.txt');
      const { context } = await api.handle(adapter);
      
      expect(context.res.body).toEqual(fileData);
    });
  });
});