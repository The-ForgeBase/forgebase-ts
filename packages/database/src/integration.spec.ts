import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Kysely, PostgresDialect } from 'kysely';
import { newDb } from 'pg-mem';
import express from 'express';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { ForgeDatabase } from './database';
import { DatabaseSDK } from '@forgebase/sdk/client';
import type { UserContext, TablePermissions } from './types';

/**
 * Helper: convert BigInt values to Number recursively so JSON.stringify works.
 * pg-mem serial columns produce BigInt IDs.
 */
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

describe('Integration Test: Client SDK & Server with RLS (using pg-mem)', () => {
  let db: Kysely<any>;
  let forgeDb: ForgeDatabase;
  let server: Server;
  let client: DatabaseSDK;
  let baseUrl: string;

  const TABLE_NAME = 'integration_users';

  // User contexts for RLS testing
  const adminUser: UserContext = {
    userId: 1,
    role: 'admin',
    labels: ['staff'],
    teams: ['engineering'],
  };

  const regularUser: UserContext = {
    userId: 2,
    role: 'user',
    labels: ['customer'],
    teams: ['free-tier'],
  };

  /**
   * Helper to extract UserContext from request headers.
   */
  const getUserFromRequest = (
    req: express.Request,
  ): UserContext | undefined => {
    const userHeader = req.headers['x-user-context'];
    if (userHeader && typeof userHeader === 'string') {
      try {
        return JSON.parse(userHeader);
      } catch {
        return undefined;
      }
    }
    return undefined;
  };

  beforeAll(async () => {
    // 1. Setup pg-mem DB (PostgreSQL in-memory)
    const mem = newDb();
    const { Pool } = mem.adapters.createPg();

    db = new Kysely({
      dialect: new PostgresDialect({
        pool: new Pool(),
      }),
    });

    // 2. Initialize ForgeDatabase with RLS enabled
    forgeDb = new ForgeDatabase({
      db,
      enforceRls: true,
      initializePermissions: true,
    });

    // 3. Setup Express Server matching SDK client URL patterns
    const app = express();
    app.use(express.json());

    // POST /query/:table — used by getRecords & table().query()
    app.post('/query/:table', async (req, res) => {
      try {
        const tableName = req.params.table;
        const params = req.body.query || {};
        const user = getUserFromRequest(req);
        const start = performance.now();
        const result = await forgeDb.endpoints.data.query(
          tableName,
          params,
          user,
          !user, // isSystem when no user provided
        );
        const duration = (performance.now() - start).toFixed(2);
        console.log(
          `[PERF] QUERY ${tableName} (${user ? `user:${user.userId}` : 'system'}) — ${duration}ms`,
        );
        res.json(sanitize(result));
      } catch (error: any) {
        res.status(403).json({ error: error.message });
      }
    });

    // POST /create/:table — used by createRecord
    // SDK client does: records: [response.data], so server must return a single object
    app.post('/create/:table', async (req, res) => {
      try {
        const tableName = req.params.table;
        const { data } = req.body;
        const user = getUserFromRequest(req);
        const start = performance.now();
        const result = await forgeDb.endpoints.data.create(
          { tableName, data },
          user,
          !user,
        );
        const duration = (performance.now() - start).toFixed(2);
        console.log(
          `[PERF] CREATE ${tableName} (${user ? `user:${user.userId}` : 'system'}) — ${duration}ms`,
        );
        // ForgeDatabase returns an array, SDK wraps [response.data], so return first element
        const record = Array.isArray(result) ? result[0] : result;
        res.json(sanitize(record));
      } catch (error: any) {
        res.status(403).json({ error: error.message });
      }
    });

    // PUT /update/:table/:id — used by updateRecord
    // SDK client does: records: [response.data], so server must return a single object
    app.put('/update/:table/:id', async (req, res) => {
      try {
        const tableName = req.params.table;
        const id = req.params.id;
        const { data } = req.body;
        const user = getUserFromRequest(req);
        const start = performance.now();
        const result = await forgeDb.endpoints.data.update(
          { tableName, id, data },
          user,
          !user,
        );
        const duration = (performance.now() - start).toFixed(2);
        console.log(
          `[PERF] UPDATE ${tableName}/${id} (${user ? `user:${user.userId}` : 'system'}) — ${duration}ms`,
        );
        const record = Array.isArray(result) ? result[0] : result;
        res.json(sanitize(record));
      } catch (error: any) {
        res.status(403).json({ error: error.message });
      }
    });

    // POST /update/:table — used by advanceUpdateRecord (query-based bulk update)
    app.post('/update/:table', async (req, res) => {
      try {
        const tableName = req.params.table;
        const { query, data } = req.body;
        const user = getUserFromRequest(req);
        const start = performance.now();
        const result = await forgeDb.endpoints.data.advanceUpdate(
          { tableName, query, data },
          user,
          !user,
        );
        const duration = (performance.now() - start).toFixed(2);
        console.log(
          `[PERF] ADV_UPDATE ${tableName} (${user ? `user:${user.userId}` : 'system'}) — ${duration}ms`,
        );
        res.json(sanitize(result));
      } catch (error: any) {
        res.status(403).json({ error: error.message });
      }
    });

    // POST /del/:table/:id — used by deleteRecord
    app.post('/del/:table/:id', async (req, res) => {
      try {
        const tableName = req.params.table;
        const id = req.params.id;
        const user = getUserFromRequest(req);
        const start = performance.now();
        const result = await forgeDb.endpoints.data.delete(
          { tableName, id },
          user,
          !user,
        );
        const duration = (performance.now() - start).toFixed(2);
        console.log(
          `[PERF] DELETE ${tableName}/${id} (${user ? `user:${user.userId}` : 'system'}) — ${duration}ms`,
        );
        res.json(sanitize(result));
      } catch (error: any) {
        res.status(403).json({ error: error.message });
      }
    });

    // POST /del/:table — used by advanceDeleteRecord (query-based bulk delete)
    app.post('/del/:table', async (req, res) => {
      try {
        const tableName = req.params.table;
        const { query } = req.body;
        const user = getUserFromRequest(req);
        const start = performance.now();
        const result = await forgeDb.endpoints.data.advanceDelete(
          { tableName, query },
          user,
          !user,
        );
        const duration = (performance.now() - start).toFixed(2);
        console.log(
          `[PERF] ADV_DELETE ${tableName} (${user ? `user:${user.userId}` : 'system'}) — ${duration}ms`,
        );
        res.json(sanitize(result));
      } catch (error: any) {
        res.status(403).json({ error: error.message });
      }
    });

    // Start Server
    await new Promise<void>((resolve) => {
      server = createServer(app).listen(0, () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });

    // 4. Initialize Client SDK (system-level — no user header)
    client = new DatabaseSDK({ baseUrl });

    // 5. Create Table
    await db.schema
      .createTable(TABLE_NAME)
      .addColumn('id', 'serial', (col) => col.primaryKey().notNull())
      .addColumn('name', 'text', (col) => col.notNull())
      .addColumn('email', 'text', (col) => col.unique().notNull())
      .addColumn('age', 'integer')
      .addColumn('owner_id', 'integer')
      .execute();
  });

  afterAll(async () => {
    if (db) {
      await db.destroy();
    }
    if (server) {
      server.close();
    }
  });

  // ============================================================
  // Section 1: System-level CRUD (no RLS / isSystem=true)
  // ============================================================
  describe('System-level CRUD (bypassing RLS)', () => {
    it('should create a record as system', async () => {
      const newUser = {
        name: 'Alice',
        email: 'alice@example.com',
        age: 30,
        owner_id: 1,
      };
      const response = await client.createRecord<any>(TABLE_NAME, newUser);
      expect(response.records).toBeDefined();
      expect(response.records![0]).toMatchObject(newUser);
      expect(response.records![0].id).toBeDefined();
    });

    it('should query records as system', async () => {
      const response = await client.getRecords(TABLE_NAME);
      expect(response.records).toBeDefined();
      expect(response.records!.length).toBeGreaterThanOrEqual(1);
      expect(response.records![0].name).toBe('Alice');
    });

    it('should filter records using query builder', async () => {
      // Insert another user
      await client.createRecord(TABLE_NAME, {
        name: 'Bob',
        email: 'bob@example.com',
        age: 25,
        owner_id: 2,
      });

      // Query with filter
      const response = await client
        .table(TABLE_NAME)
        .where('age', '>', 28)
        .query();

      expect(response.records).toBeDefined();
      expect(response.records).toHaveLength(1);
      expect(response.records![0].name).toBe('Alice');
    });

    it('should update a record as system', async () => {
      const records = await client.getRecords<any>(TABLE_NAME);
      const alice = records.records!.find((r: any) => r.name === 'Alice');

      const response = await client.updateRecord(TABLE_NAME, alice.id, {
        age: 31,
      });
      expect(response.records).toBeDefined();
      expect(response.records![0].age).toBe(31);
    });

    it('should delete a record as system', async () => {
      const records = await client.getRecords<any>(TABLE_NAME);
      const bob = records.records!.find((r: any) => r.name === 'Bob');

      const response = await client.deleteRecord(TABLE_NAME, bob.id);
      expect(response.records).toBeDefined();

      // Verify Bob is gone
      const recordsAfter = await client.getRecords<any>(TABLE_NAME);
      const bobAfter = recordsAfter.records!.find((r: any) => r.name === 'Bob');
      expect(bobAfter).toBeUndefined();
    });
  });

  // ============================================================
  // Section 2: QueryBuilder Fluent API
  // ============================================================
  describe('QueryBuilder fluent API', () => {
    beforeAll(async () => {
      // Seed data for query builder tests — insert via DB directly to avoid RLS
      // Alice (id=1, age=31, owner_id=1) already exists from Section 1
      await db
        .insertInto(TABLE_NAME)
        .values([
          {
            name: 'Bob',
            email: 'bob_qb@example.com',
            age: 25,
            owner_id: 2,
          },
          {
            name: 'Charlie',
            email: 'charlie_qb@example.com',
            age: 35,
            owner_id: 1,
          },
          {
            name: 'Diana',
            email: 'diana_qb@example.com',
            age: 28,
            owner_id: 2,
          },
          {
            name: 'Eve',
            email: 'eve_qb@example.com',
            age: 22,
            owner_id: 1,
          },
        ])
        .execute();

      // Reset permissions to public SELECT for query tests
      const permissions: TablePermissions = {
        operations: {
          SELECT: [{ allow: 'public' }],
          INSERT: [{ allow: 'public' }],
          UPDATE: [{ allow: 'public' }],
          DELETE: [{ allow: 'public' }],
        },
      };
      await forgeDb
        .getPermissionService()
        .setPermissionsForTable(TABLE_NAME, permissions);
    });

    it('should select specific fields', async () => {
      const response = await client
        .table(TABLE_NAME)
        .select('name', 'age')
        .limit(1)
        .query();

      expect(response.records).toBeDefined();
      expect(response.records!.length).toBe(1);
      const record = response.records![0];
      // Should have name and age but not email or owner_id
      expect(record.name).toBeDefined();
      expect(record.age).toBeDefined();
    });

    it('should order results by field ascending', async () => {
      const response = await client
        .table(TABLE_NAME)
        .orderBy('age', 'asc')
        .query();

      expect(response.records).toBeDefined();
      expect(response.records!.length).toBeGreaterThanOrEqual(2);
      const ages = response.records!.map((r: any) => r.age);
      for (let i = 1; i < ages.length; i++) {
        expect(ages[i]).toBeGreaterThanOrEqual(ages[i - 1]);
      }
    });

    it('should order results by field descending', async () => {
      const response = await client
        .table(TABLE_NAME)
        .orderBy('age', 'desc')
        .query();

      expect(response.records).toBeDefined();
      const ages = response.records!.map((r: any) => r.age);
      for (let i = 1; i < ages.length; i++) {
        expect(ages[i]).toBeLessThanOrEqual(ages[i - 1]);
      }
    });

    it('should limit results', async () => {
      const response = await client.table(TABLE_NAME).limit(2).query();

      expect(response.records).toBeDefined();
      expect(response.records!.length).toBe(2);
    });

    it('should offset results', async () => {
      // Get all records ordered by id
      const allResponse = await client
        .table(TABLE_NAME)
        .orderBy('id', 'asc')
        .query();

      // Get records with offset=2
      const offsetResponse = await client
        .table(TABLE_NAME)
        .orderBy('id', 'asc')
        .offset(2)
        .query();

      expect(offsetResponse.records).toBeDefined();
      // The first record with offset=2 should be the third record overall
      expect(offsetResponse.records![0].id).toBe(allResponse.records![2].id);
    });

    it('should combine limit and offset for pagination', async () => {
      const page1 = await client
        .table(TABLE_NAME)
        .orderBy('id', 'asc')
        .limit(2)
        .offset(0)
        .query();

      const page2 = await client
        .table(TABLE_NAME)
        .orderBy('id', 'asc')
        .limit(2)
        .offset(2)
        .query();

      expect(page1.records).toHaveLength(2);
      expect(page2.records).toHaveLength(2);
      // Pages should not overlap
      expect(page1.records![0].id).not.toBe(page2.records![0].id);
      expect(page1.records![1].id).not.toBe(page2.records![0].id);
    });

    it('should filter with whereIn', async () => {
      const response = await client
        .table(TABLE_NAME)
        .whereIn('name', ['Alice', 'Charlie', 'Eve'])
        .orderBy('name', 'asc')
        .query();

      expect(response.records).toBeDefined();
      expect(response.records!.length).toBe(3);
      expect(response.records!.map((r: any) => r.name)).toEqual([
        'Alice',
        'Charlie',
        'Eve',
      ]);
    });

    it('should filter with whereNotIn', async () => {
      const response = await client
        .table(TABLE_NAME)
        .whereNotIn('name', ['Alice', 'Charlie', 'Eve'])
        .orderBy('name', 'asc')
        .query();

      expect(response.records).toBeDefined();
      // Should only have Bob and Diana
      const names = response.records!.map((r: any) => r.name);
      expect(names).toContain('Bob');
      expect(names).toContain('Diana');
      expect(names).not.toContain('Alice');
    });

    it('should filter with whereBetween', async () => {
      const response = await client
        .table(TABLE_NAME)
        .whereBetween('age', [25, 30])
        .orderBy('age', 'asc')
        .query();

      expect(response.records).toBeDefined();
      response.records!.forEach((r: any) => {
        expect(r.age).toBeGreaterThanOrEqual(25);
        expect(r.age).toBeLessThanOrEqual(30);
      });
    });

    it('should combine multiple where clauses (AND)', async () => {
      const response = await client
        .table(TABLE_NAME)
        .where('owner_id', '=', 1)
        .where('age', '>', 25)
        .query();

      expect(response.records).toBeDefined();
      response.records!.forEach((r: any) => {
        expect(r.owner_id).toBe(1);
        expect(r.age).toBeGreaterThan(25);
      });
    });

    it('should use table().create()', async () => {
      const response = await client.table(TABLE_NAME).create({
        name: 'Frank',
        email: 'frank@example.com',
        age: 40,
        owner_id: 1,
      });

      expect(response.records).toBeDefined();
      expect(response.records![0].name).toBe('Frank');
      expect(response.records![0].age).toBe(40);
    });

    it('should use table().update()', async () => {
      const records = await client.getRecords<any>(TABLE_NAME);
      const frank = records.records!.find((r: any) => r.name === 'Frank');
      expect(frank).toBeDefined();

      const response = await client
        .table(TABLE_NAME)
        .update(frank.id, { age: 41 });

      expect(response.records).toBeDefined();
      expect(response.records![0].age).toBe(41);
    });

    it('should use table().delete()', async () => {
      const records = await client.getRecords<any>(TABLE_NAME);
      const frank = records.records!.find((r: any) => r.name === 'Frank');
      expect(frank).toBeDefined();

      const response = await client.table(TABLE_NAME).delete(frank.id);
      expect(response.records).toBeDefined();

      // Verify Frank is gone
      const after = await client.getRecords<any>(TABLE_NAME);
      const frankAfter = after.records!.find((r: any) => r.name === 'Frank');
      expect(frankAfter).toBeUndefined();
    });
  });

  // ============================================================
  // Section 3: Advanced Operations (advanceUpdate / advanceDelete)
  // ============================================================
  describe('Advanced Operations (query-based update/delete)', () => {
    beforeAll(async () => {
      // Ensure we have known data — insert test-specific records
      await db
        .insertInto(TABLE_NAME)
        .values([
          {
            name: 'Adv_User1',
            email: 'adv1@example.com',
            age: 50,
            owner_id: 1,
          },
          {
            name: 'Adv_User2',
            email: 'adv2@example.com',
            age: 50,
            owner_id: 2,
          },
          {
            name: 'Adv_User3',
            email: 'adv3@example.com',
            age: 60,
            owner_id: 1,
          },
        ])
        .execute();
    });

    it('should advanceUpdate records matching a query', async () => {
      // Update all records where age=50 → set age=51
      const response = await client
        .table(TABLE_NAME)
        .where('age', '=', 50)
        .advanceUpdate({ age: 51 });

      expect(response.records).toBeDefined();
      expect(response.records!.length).toBe(2);
      response.records!.forEach((r: any) => {
        expect(r.age).toBe(51);
      });
    });

    it('should advanceDelete records matching a query', async () => {
      // Delete all records where age=60
      const response = await client
        .table(TABLE_NAME)
        .where('age', '=', 60)
        .advanceDelete();

      expect(response.records).toBeDefined();
      expect(response.records!.length).toBe(1);

      // Verify Adv_User3 is gone
      const after = await client.getRecords<any>(TABLE_NAME);
      const adv3 = after.records!.find((r: any) => r.name === 'Adv_User3');
      expect(adv3).toBeUndefined();
    });

    it('should advanceUpdate with complex conditions', async () => {
      // Update records where age=51 AND owner_id=1
      const response = await client
        .table(TABLE_NAME)
        .where('age', '=', 51)
        .where('owner_id', '=', 1)
        .advanceUpdate({ age: 52 });

      expect(response.records).toBeDefined();
      expect(response.records!.length).toBe(1);
      expect(response.records![0].age).toBe(52);
      expect(response.records![0].owner_id).toBe(1);
    });

    it('should clean up adv records via advanceDelete', async () => {
      // Clean up: delete remaining adv records
      const response = await client
        .table(TABLE_NAME)
        .whereIn('name', ['Adv_User1', 'Adv_User2'])
        .advanceDelete();

      expect(response.records).toBeDefined();
      expect(response.records!.length).toBe(2);
    });
  });

  // ============================================================
  // Section 4: RLS — Public permission
  // ============================================================
  describe('RLS: Public permission', () => {
    beforeAll(async () => {
      const permissions: TablePermissions = {
        operations: {
          SELECT: [{ allow: 'public' }],
          INSERT: [{ allow: 'auth' }],
          UPDATE: [{ allow: 'auth' }],
          DELETE: [{ allow: 'role', roles: ['admin'] }],
        },
      };
      await forgeDb
        .getPermissionService()
        .setPermissionsForTable(TABLE_NAME, permissions);
    });

    it('should allow unauthenticated read with public SELECT', async () => {
      // System client (no x-user-context header) → routes treat as system
      const response = await client.getRecords(TABLE_NAME);
      expect(response.records).toBeDefined();
      expect(response.records!.length).toBeGreaterThanOrEqual(1);
    });

    it('should allow authenticated user to create a record', async () => {
      const authClient = new DatabaseSDK({ baseUrl });
      authClient.getAxiosInstance().interceptors.request.use((config) => {
        config.headers['x-user-context'] = JSON.stringify(regularUser);
        return config;
      });

      const newUser = {
        name: 'Charlie',
        email: 'charlie@example.com',
        age: 28,
        owner_id: 2,
      };
      const response = await authClient.createRecord<any>(TABLE_NAME, newUser);
      expect(response.records).toBeDefined();
      expect(response.records![0]).toMatchObject(newUser);
    });

    it('should allow admin to delete a record', async () => {
      const adminClient = new DatabaseSDK({ baseUrl });
      adminClient.getAxiosInstance().interceptors.request.use((config) => {
        config.headers['x-user-context'] = JSON.stringify(adminUser);
        return config;
      });

      // Find Charlie
      const records = await adminClient.getRecords<any>(TABLE_NAME);
      const charlie = records.records!.find((r: any) => r.name === 'Charlie');
      expect(charlie).toBeDefined();

      const response = await adminClient.deleteRecord(TABLE_NAME, charlie.id);
      expect(response.records).toBeDefined();
    });

    it('should deny non-admin from deleting a record', async () => {
      const userClient = new DatabaseSDK({ baseUrl });
      userClient.getAxiosInstance().interceptors.request.use((config) => {
        config.headers['x-user-context'] = JSON.stringify(regularUser);
        return config;
      });

      const records = await userClient.getRecords<any>(TABLE_NAME);
      const alice = records.records!.find((r: any) => r.name === 'Alice');
      expect(alice).toBeDefined();

      await expect(
        userClient.deleteRecord(TABLE_NAME, alice.id),
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // Section 5: RLS — FieldCheck (owner-based access)
  // ============================================================
  describe('RLS: FieldCheck (owner-based access)', () => {
    beforeAll(async () => {
      // Set fieldCheck permissions: users can only SELECT/UPDATE/DELETE their own rows
      const permissions: TablePermissions = {
        operations: {
          SELECT: [
            {
              allow: 'fieldCheck',
              fieldCheck: {
                field: 'owner_id',
                operator: '===',
                valueType: 'userContext',
                value: 'userId',
              },
            },
          ],
          INSERT: [{ allow: 'auth' }],
          UPDATE: [
            {
              allow: 'fieldCheck',
              fieldCheck: {
                field: 'owner_id',
                operator: '===',
                valueType: 'userContext',
                value: 'userId',
              },
            },
          ],
          DELETE: [
            {
              allow: 'fieldCheck',
              fieldCheck: {
                field: 'owner_id',
                operator: '===',
                valueType: 'userContext',
                value: 'userId',
              },
            },
          ],
        },
      };
      await forgeDb
        .getPermissionService()
        .setPermissionsForTable(TABLE_NAME, permissions);
    });

    it('admin should only see their own rows', async () => {
      const adminClient = new DatabaseSDK({ baseUrl });
      adminClient.getAxiosInstance().interceptors.request.use((config) => {
        config.headers['x-user-context'] = JSON.stringify(adminUser);
        return config;
      });

      const response = await adminClient.getRecords<any>(TABLE_NAME);
      expect(response.records).toBeDefined();
      // Admin (userId=1) should only see rows with owner_id=1
      response.records!.forEach((r: any) => {
        expect(r.owner_id).toBe(adminUser.userId);
      });
    });

    it('regular user should only see their own rows', async () => {
      const userClient = new DatabaseSDK({ baseUrl });
      userClient.getAxiosInstance().interceptors.request.use((config) => {
        config.headers['x-user-context'] = JSON.stringify(regularUser);
        return config;
      });

      const response = await userClient.getRecords<any>(TABLE_NAME);
      expect(response.records).toBeDefined();
      expect(response.records!.length).toBeGreaterThanOrEqual(1);
      // Regular user (userId=2) should only see rows with owner_id=2
      response.records!.forEach((r: any) => {
        expect(r.owner_id).toBe(regularUser.userId);
      });
    });

    it('user should be able to update their own record', async () => {
      const userClient = new DatabaseSDK({ baseUrl });
      userClient.getAxiosInstance().interceptors.request.use((config) => {
        config.headers['x-user-context'] = JSON.stringify(regularUser);
        return config;
      });

      // Find a record owned by regularUser
      const records = await userClient.getRecords<any>(TABLE_NAME);
      const ownRecord = records.records![0];
      expect(ownRecord).toBeDefined();

      const response = await userClient.updateRecord(TABLE_NAME, ownRecord.id, {
        age: 26,
      });
      expect(response.records).toBeDefined();
      expect(response.records![0].age).toBe(26);
    });

    it("user should NOT be able to update another user's record", async () => {
      const userClient = new DatabaseSDK({ baseUrl });
      userClient.getAxiosInstance().interceptors.request.use((config) => {
        config.headers['x-user-context'] = JSON.stringify(regularUser);
        return config;
      });

      // Try to update Alice's record (owned by admin, userId=1)
      const allRecords = await client.getRecords<any>(TABLE_NAME);
      const alice = allRecords.records!.find((r: any) => r.name === 'Alice');
      expect(alice).toBeDefined();

      await expect(
        userClient.updateRecord(TABLE_NAME, alice.id, { age: 99 }),
      ).rejects.toThrow();
    });
  });

  // ============================================================
  // Section 6: RLS — Role-based access
  // ============================================================
  describe('RLS: Role-based access', () => {
    beforeAll(async () => {
      // Set role-based permissions: only admin can do everything
      const permissions: TablePermissions = {
        operations: {
          SELECT: [{ allow: 'role', roles: ['admin'] }],
          INSERT: [{ allow: 'role', roles: ['admin'] }],
          UPDATE: [{ allow: 'role', roles: ['admin'] }],
          DELETE: [{ allow: 'role', roles: ['admin'] }],
        },
      };
      await forgeDb
        .getPermissionService()
        .setPermissionsForTable(TABLE_NAME, permissions);
    });

    it('admin should be able to query records', async () => {
      const adminClient = new DatabaseSDK({ baseUrl });
      adminClient.getAxiosInstance().interceptors.request.use((config) => {
        config.headers['x-user-context'] = JSON.stringify(adminUser);
        return config;
      });

      const response = await adminClient.getRecords<any>(TABLE_NAME);
      expect(response.records).toBeDefined();
      expect(response.records!.length).toBeGreaterThanOrEqual(1);
    });

    it('regular user should be denied from querying records', async () => {
      const userClient = new DatabaseSDK({ baseUrl });
      userClient.getAxiosInstance().interceptors.request.use((config) => {
        config.headers['x-user-context'] = JSON.stringify(regularUser);
        return config;
      });

      await expect(userClient.getRecords<any>(TABLE_NAME)).rejects.toThrow();
    });

    it('regular user should be denied from creating records', async () => {
      const userClient = new DatabaseSDK({ baseUrl });
      userClient.getAxiosInstance().interceptors.request.use((config) => {
        config.headers['x-user-context'] = JSON.stringify(regularUser);
        return config;
      });

      await expect(
        userClient.createRecord(TABLE_NAME, {
          name: 'Denied',
          email: 'denied@example.com',
          age: 20,
          owner_id: 2,
        }),
      ).rejects.toThrow();
    });
  });
});
