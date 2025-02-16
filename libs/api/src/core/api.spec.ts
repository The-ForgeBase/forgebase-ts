import { ForgeApi } from './api';
import { Context, Handler, ServerAdapter } from '../types';
import { UserContext } from '@forgebase-ts/database';

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

  getUserContext(): UserContext {
    return {
      userId: '1',
      labels: [],
      teams: [],
      permissions: [],
      role: 'user',
    };
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
        ctx.req.userContext = {
          userId: '123',
          labels: ['test-label'],
          teams: ['test-team'],
          permissions: ['read'],
          role: 'tester',
        };
      };

      const routeHandler: Handler = async (ctx: Context) => {
        ctx.res.body = ctx.req.userContext;
      };

      api.use(middleware);
      api.get('/test', routeHandler);

      const adapter = new MockServerAdapter('GET', '/api/test');
      const { context } = await api.handle(adapter);

      expect(context.res.body).toEqual({
        userId: '123',
        labels: ['test-label'],
        teams: ['test-team'],
        permissions: ['read'],
        role: 'tester',
      });
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
    beforeEach(async () => {
      // Create users table schema first
      const createTableAdapter = new MockServerAdapter(
        'POST',
        '/api/db/schema',
        {
          tableName: 'users',
          columns: [
            {
              name: 'id',
              type: 'integer',
              primaryKey: true,
              autoIncrement: true,
            },
            { name: 'name', type: 'text' },
            {
              name: 'created_at',
              type: 'timestamp',
              defaultValue: 'CURRENT_TIMESTAMP',
            },
          ],
        }
      );
      await api.handle(createTableAdapter);
    });

    it('should handle database insert', async () => {
      const testData = { name: 'Test' };
      const adapter = new MockServerAdapter('POST', '/api/db/users', {
        data: testData,
      });

      const { context } = await api.handle(adapter);

      expect(context.res.status).toBe(201);
      expect(context.res.body).toHaveProperty('id');
    });

    it('should handle database query', async () => {
      // First insert test data
      const insertAdapter = new MockServerAdapter('POST', '/api/db/users', {
        data: { name: 'Test' },
      });
      await api.handle(insertAdapter);

      // Then query it
      const adapter = new MockServerAdapter('GET', '/api/db/users', null, {
        filter: JSON.stringify({ name: 'Test' }),
      });

      const { context } = await api.handle(adapter);

      expect(context.res.status).toBe(200);
      expect(context.res.body).toHaveLength(1);
      expect(context.res.body[0].name).toBe('Test');
    });
  });

  describe('Storage Routes', () => {
    const testBucket = 'public';
    const testKey = 'test.txt';
    const fileData = Buffer.from('test file content');

    // Clean up after each test
    afterEach(async () => {
      const storageService = api.getStorageService();
      try {
        // await storageService.delete(testBucket, testKey);
      } catch (e) {
        // Ignore deletion errors
      }
    });

    it('should handle file upload', async () => {
      const adapter = new MockServerAdapter(
        'POST',
        `/api/storage/${testBucket}/${testKey}`,
        fileData
      );

      const { context } = await api.handle(adapter);

      expect(context.res.status).toBe(201);
    });

    it('should handle file download', async () => {
      // First upload a file
      await api.handle(
        new MockServerAdapter(
          'POST',
          `/api/storage/${testBucket}/${testKey}`,
          fileData
        )
      );

      // Then try to download it
      const adapter = new MockServerAdapter(
        'GET',
        `/api/storage/${testBucket}/${testKey}`
      );
      const { context } = await api.handle(adapter);

      // Convert the response body to Buffer if it isn't already
      const responseBuffer = Buffer.isBuffer(context.res.body)
        ? context.res.body
        : Buffer.from(context.res.body.data);

      expect(responseBuffer).toEqual(fileData);
    });
  });
});
