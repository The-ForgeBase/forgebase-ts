import express from 'express';
import { ForgeDatabase } from '@forgebase/database';

// Helper to handle BigInt serialization
function sanitize(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(sanitize);
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = sanitize(v);
    }
    return result;
  }
  return obj;
}

async function startServer() {
  // 1. Initialize ForgeDatabase with Libsql
  // Using a file-based URL for now as per example, but could use :memory: if supported by the driver/wrapper
  const dbFile = `test-${Math.random().toString(36).substring(7)}.db`;
  const url = `file:${dbFile}`;

  console.log(`Initializing LibSQL with url: ${url}`);

  const forgeDb = new ForgeDatabase({
    libsql: { url },
    enforceRls: false, // simplified for this test
  });

  await forgeDb.ready();

  // 2. Seed Data using ForgeDatabase Schema API or direct SQL if possible

  // Note: ForgeDatabase initializes Kysely internally.
  // We can use forgeDb.endpoints.schema.createTable if available or we might need access to the internal db instance
  // if we want to run raw SQL for seeding.
  // The integration test example shows creating tables via `forgeDb.endpoints.schema.create`.

  console.log('Seeding database...');

  await forgeDb.endpoints.schema.create({
    tableName: 'users',
    columns: [
      { name: 'id', type: 'increments', primary: true, nullable: false },
      { name: 'lv', type: 'uuid', nullable: true },
      { name: 'email', type: 'text', nullable: false },
      { name: 'age', type: 'integer', nullable: true },
      { name: 'is_active', type: 'boolean', nullable: true }, // LibSQL handles boolean as integer usually
    ],
  });

  await forgeDb.endpoints.schema.create({
    tableName: 'posts',
    columns: [
      { name: 'id', type: 'increments', primary: true, nullable: false },
      { name: 'title', type: 'text', nullable: false },
      { name: 'content', type: 'text', nullable: true },
      { name: 'author_id', type: 'integer', nullable: true }, // references users.id ideally
    ],
  });

  // Insert data
  // casting to any to bypass strict type checks for this quick seed
  await forgeDb.endpoints.data.create(
    {
      tableName: 'users',
      data: { email: 'alice@example.com', age: 30, is_active: true },
    },
    undefined,
    true,
  );
  await forgeDb.endpoints.data.create(
    {
      tableName: 'users',
      data: { email: 'bob@example.com', age: 25, is_active: false },
    },
    undefined,
    true,
  );

  await forgeDb.endpoints.data.create(
    {
      tableName: 'posts',
      data: { title: 'Hello World', content: 'First post', author_id: 1 },
    },
    undefined,
    true,
  );
  await forgeDb.endpoints.data.create(
    {
      tableName: 'posts',
      data: {
        title: 'ForgeBase Rocks',
        content: 'It really does',
        author_id: 1,
      },
    },
    undefined,
    true,
  );

  console.log('Database seeded!');

  // 3. Express Server
  const app = express();
  app.use(express.json());

  // Schema Endpoint (for CLI)
  app.get('/schema', async (req, res) => {
    try {
      const schema = await forgeDb.endpoints.schema.get();
      console.log(JSON.stringify(schema));
      res.json(sanitize(schema));
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Query Endpoint (for SDK)
  app.post('/query/:table', async (req, res) => {
    try {
      const tableName = req.params.table;
      const params = req.body;

      const result = await forgeDb.endpoints.data.query(
        tableName,
        params,
        undefined, // user
        true, // isSystem
      );

      res.json(sanitize(result));
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  const PORT = 3333;
  const server = app.listen(PORT, () => {
    console.log(`Integration test server running at http://localhost:${PORT}`);
    console.log(`Schema endpoint: http://localhost:${PORT}/schema`);
  });

  // Handle shutdown gracefully
  const cleanup = () => {
    server.close(() => {
      console.log('Server terminated');
      // Cleanup db file
      try {
        // fs.unlinkSync(dbFile);
        // fs.unlinkSync(`${dbFile}-shm`);
        // fs.unlinkSync(`${dbFile}-wal`);
      } catch (e) {}
      process.exit(0);
    });
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
}

startServer().catch(console.error);
