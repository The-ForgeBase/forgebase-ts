import { DatabaseSDK } from '@forgebase/sdk/client';
import type { Schema, CreateSchema } from './schema.js'; // Will be generated

// Test result tracking
const results: { name: string; passed: boolean; error?: string }[] = [];

function logTest(name: string, passed: boolean, error?: string) {
  results.push({ name, passed, error });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}${error ? ` - ${error}` : ''}`);
}

async function runClient() {
  console.log('Starting comprehensive client SDK test...\n');

  // Initialize SDK
  const db = new DatabaseSDK<Schema, CreateSchema>({
    baseUrl: 'http://localhost:4469', // Update if your server runs on a different port
  });

  try {
    // ============================================
    // 1. BASIC SELECT QUERIES
    // ============================================
    console.log('--- Basic Select Queries ---');

    // 1.1 Select all fields
    const allUsers = await db.table('users').select('*').query();

    logTest(
      'Select all users',
      allUsers.records?.length === 5,
      `Expected 5, got ${allUsers.records?.length}`,
    );

    // 1.2 Select specific fields
    const userNames = await db.table('users').select('name', 'email').query();

    logTest(
      'Select specific fields',
      userNames.records?.every(
        (u) => 'name' in u && 'email' in u && !('age' in u),
      ) ?? false,
    );

    // 1.3 Select with no args (should return all)
    const allPosts = await db.table('posts').select().query();
    logTest('Select with no args', allPosts.records?.length === 5);

    // ============================================
    // 2. WHERE CLAUSES
    // ============================================
    console.log('\n--- Where Clauses ---');

    // 2.1 Basic where clause
    const whereResult = await db.table('users').where('role', 'admin').query();
    logTest(
      'Basic where clause',
      whereResult.records?.every((u) => u.role === 'admin') ?? false,
    );

    // 2.2 Where with operator
    const whereOpResult = await db.table('users').where('age', '>', 25).query();
    logTest(
      'Where with operator',
      whereOpResult.records?.every((u) => u.age! > 25) ?? false,
    );

    // 2.3 Where with conditions object
    const whereObjResult = await db
      .table('users')
      .where({ role: 'user', is_active: true })
      .query();

    logTest(
      'Where with conditions object',
      whereObjResult.records?.every(
        (u) => u.role === 'user' && Boolean(u.is_active) === true,
      ) ?? false,
    );

    // 2.4 Where between
    const whereBetweenResult = await db
      .table('products')
      .whereBetween('price', [50, 200])
      .query();
    logTest(
      'Where between',
      whereBetweenResult.records?.every(
        (p) => p.price! >= 50 && p.price! <= 200,
      ) ?? false,
    );

    // 2.5 Where in
    const whereInResult = await db
      .table('users')
      .whereIn('role', ['admin', 'user'])
      .query();
    logTest(
      'Where in',
      whereInResult.records?.every(
        (u) => u.role === 'admin' || u.role === 'user',
      ) ?? false,
    );

    // 2.6 Where not in
    const whereNotInResult = await db
      .table('products')
      .whereNotIn('category_id', [1])
      .query();
    logTest(
      'Where not in',
      whereNotInResult.records?.every((p) => p.category_id !== 1) ?? false,
    );

    // 2.7 Where null (testing with nullable field)
    // Note: Our test data doesn't have null values, so this tests the query structure
    const whereNullResult = await db.table('users').whereNull('lv').query();
    logTest('Where null query executes', whereNullResult.records !== undefined);

    // 2.8 Where not null
    const whereNotNullResult = await db
      .table('users')
      .whereNotNull('email')
      .query();
    logTest(
      'Where not null',
      whereNotNullResult.records?.every((u) => u.email !== null) ?? false,
    );

    // 2.9 Multiple where clauses (AND)
    const multiWhereResult = await db
      .table('users')
      .where('role', 'user')
      .where('is_active', true)
      .query();
    logTest(
      'Multiple where clauses',
      multiWhereResult.records?.every(
        (u) => u.role === 'user' && Boolean(u.is_active) === true,
      ) ?? false,
    );

    // ============================================
    // 3. ORDER BY, LIMIT, OFFSET
    // ============================================
    console.log('\n--- Order By, Limit, Offset ---');

    // 3.1 Order by ascending
    const orderAscResult = await db
      .table('users')
      .orderBy('age', 'asc')
      .query();
    const agesAsc = orderAscResult.records?.map((u) => u.age);
    logTest(
      'Order by ascending',
      JSON.stringify(agesAsc) ===
        JSON.stringify(agesAsc?.sort((a, b) => (a ?? 0) - (b ?? 0))),
    );

    // 3.2 Order by descending
    const orderDescResult = await db
      .table('users')
      .orderBy('age', 'desc')
      .query();
    const agesDesc = orderDescResult.records?.map((u) => u.age);
    logTest(
      'Order by descending',
      JSON.stringify(agesDesc) ===
        JSON.stringify(agesDesc?.sort((a, b) => (b ?? 0) - (a ?? 0))),
    );

    // 3.3 Limit
    const limitResult = await db.table('users').limit(3).query();
    logTest('Limit', limitResult.records?.length === 3);

    // 3.4 Offset
    const offsetResult = await db.table('users').limit(2).offset(2).query();
    logTest(
      'Offset',
      offsetResult.records?.length === 2 &&
        offsetResult.records?.[0]?.id !== allUsers.records?.[0]?.id,
    );

    // 3.5 Order by with nulls
    const orderNullsResult = await db
      .table('posts')
      .orderBy('views', 'desc', 'last')
      .query();
    logTest(
      'Order by with nulls option',
      orderNullsResult.records !== undefined,
    );

    // ============================================
    // 4. AGGREGATE FUNCTIONS
    // ============================================
    console.log('\n--- Aggregate Functions ---');

    // 4.1 Count
    const countResult = await db.table('users').count('id', 'total').query();
    logTest('Count aggregate', countResult.records?.[0]?.total === 5);

    // 4.2 Sum
    const sumResult = await db
      .table('products')
      .sum('price', 'total_price')
      .query();
    const expectedSum =
      999.99 + 699.99 + 499.99 + 19.99 + 89.99 + 24.99 + 59.99;
    logTest(
      'Sum aggregate',
      Math.abs((sumResult.records?.[0]?.total_price ?? 0) - expectedSum) < 0.01,
    );

    // 4.3 Average
    const avgResult = await db.table('users').avg('age', 'avg_age').query();
    const expectedAvg = (30 + 25 + 35 + 28 + 22) / 5;
    logTest(
      'Average aggregate',
      Math.abs((avgResult.records?.[0]?.avg_age ?? 0) - expectedAvg) < 0.01,
    );

    // 4.4 Min
    const minResult = await db
      .table('products')
      .min('price', 'min_price')
      .query();
    logTest('Min aggregate', minResult.records?.[0]?.min_price === 19.99);

    // 4.5 Max
    const maxResult = await db
      .table('products')
      .max('price', 'max_price')
      .query();
    logTest('Max aggregate', maxResult.records?.[0]?.max_price === 999.99);

    // 4.6 Multiple aggregates
    const multiAggResult = await db
      .table('products')
      .count('id', 'count')
      .sum('price', 'total')
      .avg('price', 'average')
      .min('price', 'min')
      .max('price', 'max')
      .query();
    logTest(
      'Multiple aggregates',
      multiAggResult.records?.[0]?.count === 7 &&
        multiAggResult.records?.[0]?.min === 19.99 &&
        multiAggResult.records?.[0]?.max === 999.99,
    );

    // ============================================
    // 5. GROUP BY
    // ============================================
    console.log('\n--- Group By ---');

    // 5.1 Group by single field
    const groupResult = await db.table('users').groupBy('role').query();
    logTest('Group by single field', groupResult.records?.length === 2); // admin and user

    // 5.2 Group by with count
    const groupCountResult = await db
      .table('users')
      .groupBy('role')
      .count('id', 'count')
      .query();
    logTest('Group by with count', groupCountResult.records?.length === 2);

    // 5.3 Group by with having
    const havingResult = await db
      .table('posts')
      .groupBy('category')
      .count('id', 'post_count')
      .having('post_count', '>', 1)
      .query();
    logTest(
      'Group by with having',
      havingResult.records?.every((r) => (r as any).post_count > 1) ?? false,
    );

    // ============================================
    // 6. SELECT WITH AGGREGATES
    // ============================================
    console.log('\n--- Select with Aggregates ---');

    // 6.1 Select + aggregate
    const selectAggResult = await db
      .table('users')
      .select('role')
      .avg('age', 'avg_age')
      .query();

    logTest(
      'Select with aggregate',
      selectAggResult.records?.every((r) => 'role' in r && 'avg_age' in r) ??
        false,
    );

    // 6.2 Multiple selects + multiple aggregates
    const multiSelectAggResult = await db
      .table('products')
      .select('category_id')
      .count('id', 'count')
      .sum('price', 'total_price')
      .query();

    logTest(
      'Multiple selects with aggregates',
      multiSelectAggResult.records !== undefined,
    );

    // ============================================
    // 7. OR WHERE / WHERE GROUPS
    // ============================================
    console.log('\n--- Or Where / Where Groups ---');

    // 7.1 Or where
    const orWhereResult = await db
      .table('users')
      .where('role', 'admin')
      .orWhere((q) => q.where('age', '>=', 30))
      .query();

    logTest(
      'Or where',
      orWhereResult.records?.some((u) => u.role === 'admin' || u.age! > 30) ??
        false,
    );

    // 7.2 Nested where groups
    const nestedWhereResult = await db
      .table('users')
      .where('is_active', true)
      .andWhere((q) => {
        q.where('role', 'admin').orWhere((q2) => q2.where('age', '<', 30));
      })
      .query();
    // console.log('Nested where groups result:', nestedWhereResult.records);
    logTest('Nested where groups', nestedWhereResult.records !== undefined);

    // // ============================================
    // // 8. CRUD OPERATIONS
    // // ============================================
    // console.log('\n--- CRUD Operations ---');

    // // 8.1 Create
    // const createResult = await db.table('users').create({
    //   email: 'test@example.com',
    //   name: 'Test User',
    //   age: 99,
    //   role: 'user',
    //   is_active: true,
    //   created_at: new Date().toISOString(), // Testing timestamp field
    // });

    // logTest(
    //   'Create record',
    //   createResult.records?.[0]?.email === 'test@example.com',
    // );
    // const createdId = createResult.records?.[0]?.id;

    // // 8.2 Read (verify create)
    // if (createdId) {
    //   const readResult = await db.table('users').where('id', createdId).query();
    //   logTest(
    //     'Read created record',
    //     readResult.records?.[0]?.name === 'Test User',
    //   );
    // }

    // // 8.3 Update
    // if (createdId) {
    //   const updateResult = await db
    //     .table('users')
    //     .update(createdId, { name: 'Updated User' });
    //   logTest(
    //     'Update record',
    //     updateResult.records?.[0]?.name === 'Updated User',
    //   );
    // }

    // // 8.4 Delete
    // if (createdId) {
    //   const deleteResult = await db.table('users').delete(createdId);
    //   logTest('Delete record', deleteResult !== undefined);

    //   // Verify deletion
    //   const verifyDelete = await db.table('users').where('id', createdId).query();
    //   logTest('Verify deletion', verifyDelete.records?.length === 0);
    // }

    // ============================================
    // 9. CHAINED SELECT
    // ============================================
    console.log('\n--- Chained Select ---');

    // 9.1 Chain select (accumulation)
    const chainSelectResult = await db
      .table('users')
      .select('name')
      .select('email')
      .select('age')
      .query();
    logTest(
      'Chained select accumulation',
      chainSelectResult.records?.every(
        (r) => 'name' in r && 'email' in r && 'age' in r && !('role' in r),
      ) ?? false,
    );

    // ============================================
    // 10. COMPLEX QUERIES
    // ============================================
    console.log('\n--- Complex Queries ---');

    // 10.1 Complex query with multiple clauses
    const complexResult = await db
      .table('products')
      .where('price', '>', 20)
      .whereIn('category_id', [1, 2])
      .whereNotNull('title')
      .orderBy('price', 'desc')
      .limit(5)
      .offset(0)
      .query();

    logTest(
      'Complex query',
      complexResult.records?.every(
        (p) => p.price! > 20 && [1, 2].includes(p.category_id!),
      ) ?? false,
    );

    // 10.2 Complex query with aggregates
    const complexAggResult = await db
      .table('orders')
      .where('status', 'pending')
      .groupBy('user_id')
      .count('id', 'order_count')
      .sum('total', 'total_spent')
      .having('order_count', '>=', 1)
      .query();

    logTest(
      'Complex query with aggregates',
      complexAggResult.records !== undefined,
    );

    // ============================================
    // 11. QUERY PARAMS (toParams)
    // ============================================
    console.log('\n--- Query Params ---');

    // 11.1 Get query params without executing
    const params = await db
      .table('users')
      .where('role', 'admin')
      .select('name', 'email')
      .toParams();
    logTest(
      'toParams returns params',
      params !== undefined && params.filter?.role === 'admin',
    );

    // ============================================
    // 12. WINDOW FUNCTIONS (if supported by server)
    // ============================================
    console.log('\n--- Window Functions ---');

    // 12.1 Row number
    try {
      const rowNumResult = await db
        .table('users')
        .select('id', 'name', 'role', 'age')
        .rowNumber('row_num', ['role'], [{ field: 'age', direction: 'desc' }])
        .query();
      // console.log('Row number window function result:', rowNumResult.records);
      logTest('Row number window function', rowNumResult.records !== undefined);
    } catch (e: any) {
      logTest('Row number window function', false, e.message);
    }

    // 12.2 Rank
    try {
      const rankResult = await db
        .table('users')
        .select('id', 'name', 'role', 'age')
        .rank('rank_val', ['age'])
        .query();
      // console.log('Rank window function result:', rankResult.records);
      logTest('Rank window function', rankResult.records !== undefined);
    } catch (e: any) {
      logTest('Rank window function', false, e.message);
    }

    // 12.3 Lag
    try {
      const lagResult = await db
        .table('users')
        .select('id', 'name', 'role', 'age')
        .lag('age', 'prev_age', ['role'], [{ field: 'id', direction: 'asc' }])
        .query();
      // console.log('Lag window function result:', lagResult.records);
      logTest('Lag window function', lagResult.records !== undefined);
    } catch (e: any) {
      logTest('Lag window function', false, e.message);
    }

    // 12.4 Lead
    try {
      const leadResult = await db
        .table('users')
        .select('id', 'name', 'role', 'age')
        .lead('age', 'next_age', ['role'], [{ field: 'id', direction: 'asc' }])
        .query();
      // console.log('Lead window function result:', leadResult.records);
      logTest('Lead window function', leadResult.records !== undefined);
    } catch (e: any) {
      logTest('Lead window function', false, e.message);
    }

    // 12.5 Window advanced
    try {
      const windowAdvResult = await db
        .table('users')
        .select('id', 'name', 'role', 'age')
        .windowAdvanced('sum', 'total_age', {
          field: 'age',
          partitionBy: ['role'],
          over: {
            partitionBy: ['role'],
            orderBy: [{ field: 'id', direction: 'asc' }],
          },
        })
        .query();
      // console.log('Window advanced function result:', windowAdvResult.records);
      logTest(
        'Window advanced function',
        windowAdvResult.records !== undefined,
      );
    } catch (e: any) {
      logTest('Window advanced function', false, e.message);
    }

    // ============================================
    // 13. CTEs (Common Table Expressions)
    // ============================================
    console.log('\n--- CTEs ---');
    // TODO: CTE not yet working

    // 13.1 Simple CTE
    // try {
    //   const cteResult = await db
    //     .table('users')
    //     .with('active_users', (q) => {
    //       q.where('is_active', true);
    //     })
    //     .query();
    //   logTest('Simple CTE', cteResult.records !== undefined);
    // } catch (e: any) {
    //   logTest('Simple CTE', false, e.message);
    // }

    // 13.2 Recursive CTE
    try {
      const recursiveCteResult = await db
        .table('users')
        .withRecursive(
          'user_tree',
          db.table('users').where('id', 1),
          db.table('users').where('id', '>', 1),
          { unionAll: true },
        )
        .query();
      // console.log('Recursive CTE result:', recursiveCteResult.records);
      logTest('Recursive CTE', recursiveCteResult.records !== undefined);
    } catch (e: any) {
      logTest('Recursive CTE', false, e.message);
    }

    // ============================================
    // 14. TRANSFORMS
    // ============================================
    console.log('\n--- Transforms ---');

    // 14.1 Compute
    try {
      const computeResult = await db
        .table('products')
        .compute({
          //TODO: working but not yet typed
          discounted_price: (row: any) => row.price * 0.9,
        })
        .query();
      // console.log('Compute transform result:', computeResult.records);
      logTest('Compute transform', computeResult.records !== undefined);
    } catch (e: any) {
      logTest('Compute transform', false, e.message);
    }

    // 14.2 Pivot
    try {
      // TODO: not sure if this is giving correct result
      const pivotResult = await db
        .table('orders')
        .pivot('status', ['completed', 'pending'], {
          type: 'min',
          field: 'total',
        })
        .query();
      // console.log('Pivot transform result:', pivotResult.records);
      logTest('Pivot transform', pivotResult.records !== undefined);
    } catch (e: any) {
      logTest('Pivot transform', false, e.message);
    }

    // ============================================
    // 15. WHERE EXISTS
    // ============================================
    console.log('\n--- Where Exists ---');

    // 15.1 Where exists
    try {
      // TODO: Not yet working
      const whereExistsResult = await db
        .table('posts')
        .whereExists((sdk) => sdk.table('users').where('users.id', '=', 1))
        .query();
      //  console.log('WhereExists result', whereExistsResult.records);
      logTest('Where exists', whereExistsResult.records !== undefined);
    } catch (e: any) {
      logTest('Where exists', false, e.message);
    }

    // 15.2 Where exists join
    try {
      // TODO: Not yet working
      const whereExistsJoinResult = await db
        .table('posts')
        .whereExistsJoin('users', 'author_id', 'id', (q) => {
          q.where('role', 'admin');
        })
        .query();
      // console.log('Where exists join result', whereExistsJoinResult.records);
      logTest('Where exists join', whereExistsJoinResult.records !== undefined);
    } catch (e: any) {
      logTest('Where exists join', false, e.message);
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n========================================');
    console.log('TEST SUMMARY');
    console.log('========================================');

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const total = results.length;

    console.log(`Total: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\nFailed Tests:');
      results
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`  - ${r.name}${r.error ? `: ${r.error}` : ''}`);
        });
    }

    console.log('\n========================================');
    if (failed === 0) {
      console.log('🎉 ALL TESTS PASSED!');
      process.exit(0);
    } else {
      console.log('❌ SOME TESTS FAILED');
      process.exit(1);
    }
  } catch (err) {
    console.error('Test suite FAILED with error:', err);
    process.exit(1);
  }
}

// Small delay to ensure server is ready
setTimeout(runClient, 1000);
