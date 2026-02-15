import { DatabaseSDK } from '@forgebase/sdk/client';
import type { Schema } from './schema.js'; // Will be generated

async function runClient() {
  console.log('Starting client test...');

  // Initialize SDK
  const db = new DatabaseSDK<Schema>({
    baseUrl: 'http://localhost:3333',
    // axiosConfig: { ... }
  });

  try {
    // 1. Query Users
    console.log('Querying users...');
    const users = await db.table('users').select('email', 'age').query();
    console.log('Users:', JSON.stringify(users, null, 2));

    if (
      !users.records ||
      !Array.isArray(users.records) ||
      users.records.length !== 2
    ) {
      throw new Error('Unexpected users result');
    }

    // 2. Query Posts with Auto-Join (if supported) or simple select
    console.log('Querying posts...');
    const posts = await db.table('posts').select('*').query();
    console.log('Posts:', JSON.stringify(posts, null, 2));

    if (
      !posts.records ||
      !Array.isArray(posts.records) ||
      posts.records.length !== 2
    ) {
      throw new Error('Unexpected posts result');
    }

    console.log('Client test PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('Client test FAILED:', err);
    process.exit(1);
  }
}

// Small delay to ensure server is ready or just run
// In real world, use a wait-for-port script.
setTimeout(runClient, 1000);
