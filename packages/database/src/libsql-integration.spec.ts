import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { ForgeDatabase } from './database';
import { DatabaseSDK } from '@forgebase/sdk/client';
import type { UserContext, TablePermissions } from './types';
import fs from 'fs';

/**
 * Helper: convert BigInt values to Number recursively so JSON.stringify works.
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

describe('Libsql Integration Test: Client SDK & Server with RLS', () => {
  let forgeDb: ForgeDatabase;
  let server: Server;
  let client: DatabaseSDK;
  let baseUrl: string;
  const dbFile = `libsql-test-${Math.random().toString(36).substring(7)}.db`;

  const TABLE_NAME = 'libsql_integration_users';

  // User contexts
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
    // 1. Initialize ForgeDatabase with Libsql
    forgeDb = new ForgeDatabase({
      libsql: { url: `file:${dbFile}` },
      enforceRls: true,
      initializePermissions: true,
      defaultPermissions: {
        operations: {
          SELECT: [{ allow: 'public' }],
          INSERT: [{ allow: 'public' }],
          UPDATE: [{ allow: 'public' }],
          DELETE: [{ allow: 'public' }],
        },
      },
    });
    await forgeDb.ready();

    // 2. Setup Express Server with SDK-compatible routes
    const app = express();
    app.use(express.json());

    // GET /records/:table — used by getRecords
    app.get('/records/:table', async (req, res) => {
      try {
        const tableName = req.params.table;
        const user = getUserFromRequest(req);
        const result = await forgeDb.endpoints.data.query(
          tableName,
          {},
          user,
          !user,
        );
        res.json({ records: sanitize(result) });
      } catch (error: any) {
        res.status(403).json({ error: error.message });
      }
    });

    // POST /query/:table — used by table().query()
    app.post('/query/:table', async (req, res) => {
      try {
        const tableName = req.params.table;
        const params = req.body.query || {};
        const user = getUserFromRequest(req);
        const result = await forgeDb.endpoints.data.query(
          tableName,
          params,
          user,
          !user,
        );
        res.json(sanitize(result));
      } catch (error: any) {
        res.status(403).json({ error: error.message });
      }
    });

    // POST /create/:table — used by createRecord
    app.post('/create/:table', async (req, res) => {
      try {
        const tableName = req.params.table;
        const { data } = req.body;
        const user = getUserFromRequest(req);
        const result = await forgeDb.endpoints.data.create(
          { tableName, data },
          user,
          !user,
        );
        const record = Array.isArray(result) ? result[0] : result;
        res.json(sanitize(record));
      } catch (error: any) {
        res.status(403).json({ error: error.message });
      }
    });

    // PUT /update/:table/:id — used by updateRecord
    app.put('/update/:table/:id', async (req, res) => {
      try {
        const tableName = req.params.table;
        const id = req.params.id;
        const { data } = req.body;
        const user = getUserFromRequest(req);
        const result = await forgeDb.endpoints.data.update(
          { tableName, id, data },
          user,
          !user,
        );
        const record = Array.isArray(result) ? result[0] : result;
        res.json(sanitize(record));
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
        const result = await forgeDb.endpoints.data.delete(
          { tableName, id },
          user,
          !user,
        );
        res.json(sanitize(result));
      } catch (error: any) {
        res.status(403).json({ error: error.message });
      }
    });

    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://localhost:${port}`;
    client = new DatabaseSDK({ baseUrl });

    console.log('Creating table...');
    // 3. Create Table using ForgeDatabase API
    await forgeDb.endpoints.schema.create({
      tableName: TABLE_NAME,
      columns: [
        { name: 'id', type: 'increments', primary: true, nullable: true },
        { name: 'name', type: 'text', nullable: false },
        { name: 'email', type: 'text', unique: true, nullable: false },
        { name: 'age', type: 'integer', nullable: true },
        { name: 'owner_id', type: 'integer', nullable: true },
      ],
    });
    console.log('Table created.');
  });

  afterAll(async () => {
    // await forgeDb.getDbInstance().destroy();
    server.close();
    if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
    if (fs.existsSync(`${dbFile}-shm`)) fs.unlinkSync(`${dbFile}-shm`);
    if (fs.existsSync(`${dbFile}-wal`)) fs.unlinkSync(`${dbFile}-wal`);
  });

  it('should create and fetch records via SDK', async () => {
    const adminClient = new DatabaseSDK({ baseUrl });
    adminClient.getAxiosInstance().interceptors.request.use((config) => {
      config.headers['x-user-context'] = JSON.stringify(adminUser);
      return config;
    });

    const createRes = await adminClient.createRecord<any>(TABLE_NAME, {
      name: 'Libsql User',
      email: 'libsql@example.com',
      age: 30,
      owner_id: 1,
    });
    // The response has a records array
    const id = createRes.records![0].id;
    expect(id).toBeDefined();

    const queryRes = await adminClient.getRecords<any>(TABLE_NAME);
    const records = queryRes.records || [];
    expect(records.some((r: any) => r.id === id)).toBe(true);
  });

  it('RLS: user should only see their own records', async () => {
    const adminClient = new DatabaseSDK({ baseUrl });
    adminClient.getAxiosInstance().interceptors.request.use((config) => {
      config.headers['x-user-context'] = JSON.stringify(adminUser);
      return config;
    });

    await adminClient.createRecord(TABLE_NAME, {
      name: 'Regular User Data',
      email: 'regular@example.com',
      age: 25,
      owner_id: 2,
    });
    await adminClient.createRecord(TABLE_NAME, {
      name: 'Admin User Data',
      email: 'admin2@example.com',
      age: 25,
      owner_id: 1,
    });

    const userClient = new DatabaseSDK({ baseUrl });
    userClient.getAxiosInstance().interceptors.request.use((config) => {
      config.headers['x-user-context'] = JSON.stringify(regularUser);
      return config;
    });

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
        INSERT: [{ allow: 'public' }],
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

    const res = await userClient.getRecords<any>(TABLE_NAME);
    const records = res.records || [];
    console.log(records);
    expect(records.length).toBe(1);
    expect(records[0].owner_id).toBe(2);

    const adminRes = await adminClient.getRecords<any>(TABLE_NAME);
    const adminRecords = adminRes.records || [];
    expect(adminRecords.length).toBeGreaterThanOrEqual(2);
  });

  it('should support transactions in Libsql via ForgeDatabase', async () => {
    await forgeDb.transaction(async (trx) => {
      await forgeDb.endpoints.data.create(
        {
          tableName: TABLE_NAME,
          data: {
            name: 'Trx User',
            email: 'trx@example.com',
            age: 40,
            owner_id: 1,
          },
        },
        adminUser,
        false,
        trx,
      );
    });

    const adminClient = new DatabaseSDK({ baseUrl });
    adminClient.getAxiosInstance().interceptors.request.use((config) => {
      config.headers['x-user-context'] = JSON.stringify(adminUser);
      return config;
    });

    const res = await adminClient.getRecords<any>(TABLE_NAME);
    const records = res.records || [];
    expect(records.some((r: any) => r.name === 'Trx User')).toBe(true);
  });
});
