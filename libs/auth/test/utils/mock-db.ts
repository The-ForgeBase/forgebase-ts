import { Knex } from 'knex';
import { createTracker, MockClient, Tracker } from 'knex-mock-client';

export interface MockDb {
  db: Knex;
  tracker: Tracker;
}

export function createMockDb(): MockDb {
  const knex = require('knex');
  const db = knex({ client: MockClient });
  const tracker = createTracker(db);
  return { db, tracker };
}

export interface MockQueryOptions<T = unknown> {
  method: 'select' | 'insert' | 'update' | 'delete';
  sql?: string | RegExp;
  response: T;
  once?: boolean;
}

export function mockQuery<T>(tracker: Tracker, options: MockQueryOptions<T>) {
  const { method, sql, response, once = false } = options;

  if (once) {
    tracker.on[method](sql).responseOnce(response);
  } else {
    tracker.on[method](sql).response(response);
  }
}

export function resetTracker(tracker: Tracker) {
  tracker.reset();
}

export type MockHistory = typeof Tracker.prototype.history;
