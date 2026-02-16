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
    libsql: { url, concurrency: 6, readYourWrites: true },
    enforceRls: false, // simplified for this test
  });

  await forgeDb.ready();

  // 2. Seed Data using ForgeDatabase Schema API or direct SQL if possible
  console.log('Creating database schema...');

  // Create users table
  await forgeDb.endpoints.schema.create({
    tableName: 'users',
    columns: [
      { name: 'id', type: 'increments', primary: true, nullable: false },
      { name: 'lv', type: 'uuid', nullable: true },
      { name: 'email', type: 'text', nullable: false },
      { name: 'name', type: 'text', nullable: true },
      { name: 'age', type: 'integer', nullable: true },
      { name: 'role', type: 'text', nullable: true }, // 'admin' | 'user'
      { name: 'is_active', type: 'boolean', nullable: true },
      { name: 'created_at', type: 'text', nullable: true },
    ],
  });

  // Create posts table
  await forgeDb.endpoints.schema.create({
    tableName: 'posts',
    columns: [
      { name: 'id', type: 'increments', primary: true, nullable: false },
      { name: 'title', type: 'text', nullable: false },
      { name: 'content', type: 'text', nullable: true },
      { name: 'author_id', type: 'integer', nullable: true },
      { name: 'views', type: 'integer', nullable: true },
      { name: 'category', type: 'text', nullable: true },
      { name: 'created_at', type: 'text', nullable: true },
    ],
  });

  // Create products table
  await forgeDb.endpoints.schema.create({
    tableName: 'products',
    columns: [
      { name: 'id', type: 'increments', primary: true, nullable: false },
      { name: 'title', type: 'text', nullable: false },
      { name: 'price', type: 'real', nullable: true },
      { name: 'category_id', type: 'integer', nullable: true },
      { name: 'stock', type: 'integer', nullable: true },
      { name: 'is_available', type: 'boolean', nullable: true },
    ],
  });

  // Create categories table
  await forgeDb.endpoints.schema.create({
    tableName: 'categories',
    columns: [
      { name: 'id', type: 'increments', primary: true, nullable: false },
      { name: 'name', type: 'text', nullable: false },
      { name: 'description', type: 'text', nullable: true },
    ],
  });

  // Create orders table
  await forgeDb.endpoints.schema.create({
    tableName: 'orders',
    columns: [
      { name: 'id', type: 'increments', primary: true, nullable: false },
      { name: 'user_id', type: 'integer', nullable: true },
      { name: 'product_id', type: 'integer', nullable: true },
      { name: 'quantity', type: 'integer', nullable: true },
      { name: 'total', type: 'real', nullable: true },
      { name: 'status', type: 'text', nullable: true },
      { name: 'created_at', type: 'text', nullable: true },
    ],
  });

  console.log('Seeding database with test data...');

  // Insert users
  const users = [
    {
      email: 'alice@example.com',
      name: 'Alice',
      age: 30,
      role: 'admin',
      is_active: true,
      created_at: '2024-01-01',
    },
    {
      email: 'bob@example.com',
      name: 'Bob',
      age: 25,
      role: 'user',
      is_active: true,
      created_at: '2024-01-02',
    },
    {
      email: 'charlie@example.com',
      name: 'Charlie',
      age: 35,
      role: 'user',
      is_active: false,
      created_at: '2024-01-03',
    },
    {
      email: 'diana@example.com',
      name: 'Diana',
      age: 28,
      role: 'user',
      is_active: true,
      created_at: '2024-01-04',
    },
    {
      email: 'eve@example.com',
      name: 'Eve',
      age: 22,
      role: 'admin',
      is_active: true,
      created_at: '2024-01-05',
    },
  ];

  for (const user of users) {
    await forgeDb.endpoints.data.create(
      { tableName: 'users', data: user },
      undefined,
      true,
    );
  }

  // Insert posts
  const posts = [
    {
      title: 'Hello World',
      content: 'First post',
      author_id: 1,
      views: 100,
      category: 'tech',
      created_at: '2024-01-10',
    },
    {
      title: 'ForgeBase Rocks',
      content: 'It really does',
      author_id: 1,
      views: 250,
      category: 'tech',
      created_at: '2024-01-15',
    },
    {
      title: 'TypeScript Tips',
      content: 'Best practices',
      author_id: 2,
      views: 180,
      category: 'programming',
      created_at: '2024-01-20',
    },
    {
      title: 'Database Design',
      content: 'How to design',
      author_id: 3,
      views: 90,
      category: 'tech',
      created_at: '2024-01-25',
    },
    {
      title: 'API Development',
      content: 'REST vs GraphQL',
      author_id: 1,
      views: 320,
      category: 'programming',
      created_at: '2024-02-01',
    },
  ];

  for (const post of posts) {
    await forgeDb.endpoints.data.create(
      { tableName: 'posts', data: post },
      undefined,
      true,
    );
  }

  // Insert categories
  const categories = [
    { name: 'Electronics', description: 'Electronic devices' },
    { name: 'Books', description: 'Books and publications' },
    { name: 'Clothing', description: 'Apparel and accessories' },
  ];

  for (const category of categories) {
    await forgeDb.endpoints.data.create(
      { tableName: 'categories', data: category },
      undefined,
      true,
    );
  }

  // Insert products
  const products = [
    {
      title: 'Laptop',
      price: 999.99,
      category_id: 1,
      stock: 50,
      is_available: true,
    },
    {
      title: 'Phone',
      price: 699.99,
      category_id: 1,
      stock: 100,
      is_available: true,
    },
    {
      title: 'Tablet',
      price: 499.99,
      category_id: 1,
      stock: 75,
      is_available: true,
    },
    {
      title: 'Novel',
      price: 19.99,
      category_id: 2,
      stock: 200,
      is_available: true,
    },
    {
      title: 'Textbook',
      price: 89.99,
      category_id: 2,
      stock: 30,
      is_available: false,
    },
    {
      title: 'T-Shirt',
      price: 24.99,
      category_id: 3,
      stock: 150,
      is_available: true,
    },
    {
      title: 'Jeans',
      price: 59.99,
      category_id: 3,
      stock: 80,
      is_available: true,
    },
  ];

  for (const product of products) {
    await forgeDb.endpoints.data.create(
      { tableName: 'products', data: product },
      undefined,
      true,
    );
  }

  // Insert orders
  const orders = [
    {
      user_id: 1,
      product_id: 1,
      quantity: 1,
      total: 999.99,
      status: 'completed',
      created_at: '2024-02-01',
    },
    {
      user_id: 1,
      product_id: 4,
      quantity: 2,
      total: 39.98,
      status: 'completed',
      created_at: '2024-02-02',
    },
    {
      user_id: 2,
      product_id: 2,
      quantity: 1,
      total: 699.99,
      status: 'pending',
      created_at: '2024-02-03',
    },
    {
      user_id: 3,
      product_id: 3,
      quantity: 3,
      total: 1499.97,
      status: 'completed',
      created_at: '2024-02-04',
    },
    {
      user_id: 2,
      product_id: 6,
      quantity: 2,
      total: 49.98,
      status: 'shipped',
      created_at: '2024-02-05',
    },
  ];

  for (const order of orders) {
    await forgeDb.endpoints.data.create(
      { tableName: 'orders', data: order },
      undefined,
      true,
    );
  }

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

      console.log(
        `Received query for table ${tableName} with params:`,
        JSON.stringify(params.query),
      );

      const result = await forgeDb.endpoints.data.query(
        tableName,
        params.query,
        undefined, // user
        true, // isSystem
      );

      res.json(sanitize(result));
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Create Endpoint (for SDK)
  app.post('/create/:table', async (req, res) => {
    try {
      const tableName = req.params.table;
      const { data } = req.body;

      const result = await forgeDb.endpoints.data.create(
        { tableName, data },
        undefined,
        true,
      );

      res.json(sanitize(result));
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Update Endpoint (for SDK)
  app.put('/update/:table/:id', async (req, res) => {
    try {
      const tableName = req.params.table;
      const id = parseInt(req.params.id);
      const { data } = req.body;

      const result = await forgeDb.endpoints.data.update(
        { tableName, id, data },
        undefined,
        true,
      );

      res.json(sanitize(result));
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Delete Endpoint (for SDK)
  app.post('/del/:table/:id', async (req, res) => {
    try {
      const tableName = req.params.table;
      const id = parseInt(req.params.id);

      const result = await forgeDb.endpoints.data.delete(
        { tableName, id },
        undefined,
        true,
      );

      res.json(sanitize(result));
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Advanced Update Endpoint (for SDK)
  app.post('/update/:table', async (req, res) => {
    try {
      const tableName = req.params.table;
      const { query, data } = req.body;

      const result = await forgeDb.endpoints.data.advanceUpdate(
        { tableName, data, query },
        undefined,
        true,
      );

      res.json(sanitize(result));
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Advanced Delete Endpoint (for SDK)
  app.post('/del/:table', async (req, res) => {
    try {
      const tableName = req.params.table;
      const { query } = req.body;

      const result = await forgeDb.endpoints.data.advanceDelete(
        { tableName, query },
        undefined,
        true,
      );

      res.json(sanitize(result));
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  const PORT = 4469;
  const server = app.listen(PORT, () => {
    console.log(`Integration test server running at http://localhost:${PORT}`);
    console.log(`Schema endpoint: http://localhost:${PORT}/schema`);
  });

  // Handle shutdown gracefully
  const cleanup = () => {
    server.close(() => {
      console.log('Server terminated');
      process.exit(0);
    });
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
}

startServer().catch(console.error);
