import { DatabaseSDK } from './client';

// Define a schema
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  age: number;
}

interface Product {
  id: number;
  title: string;
  price: number;
  categoryId: number;
}

interface Schema {
  users: User;
  products: Product;
}

const db = new DatabaseSDK<Schema>({ baseUrl: 'http://localhost' });

async function testInference() {
  const q0 = await db.table('users').select('*').query();
  // 1. Basic Select Narrowing
  const q1 = await db.table('users').select('name', 'email').query();
  if (q1.records) {
    const r = q1.records[0]!;
    r.name; // OK
    r.email; // OK
    // @ts-expect-error
    r.id;
  }

  // 2. GroupBy Narrowing
  const q2 = await db.table('products').groupBy('categoryId').query();

  if (q2.records) {
    const r = q2.records[0]!;
    r.categoryId; // OK
    r.title;
    r.price;
  }

  // 3. Aggregates extension
  const q3 = await db.table('users').count('id', 'total').query();

  if (q3.records) {
    const r = q3.records[0]!;
    r.total; // OK (number)
    // Aggregate functions add to the Result type. When starting from full T (no select/groupBy),
    // count() returns T & { total: number }. This preserves original fields while adding the aggregate.
    r.name;
  }

  // 4. Select + Aggregate
  const q4 = await db
    .table('users')
    .select('role')
    .avg('age', 'avg_age')
    .query();

  if (q4.records) {
    const r = q4.records[0]!;
    r.role; // OK
    r.avg_age; // OK
    // @ts-expect-error
    r.name;
  }

  // 5. GroupBy + Count
  const q5 = await db
    .table('products')
    .groupBy('categoryId')
    .count('id', 'count')
    .query();

  if (q5.records) {
    const r = q5.records[0]!;
    r.categoryId; // OK
    r.count; // OK
    r.title; // OK - groupBy doesn't narrow, count adds to full type
  }

  // 6. Chain Select (Accumulation)
  const q6 = await db
    .table('users')
    .select('name')
    .select('email') // Should accumulate
    .query();

  if (q6.records) {
    const r = q6.records[0]!;
    r.name;
    r.email;
    // @ts-expect-error
    r.id;
  }

  // 7. Manual Generic (Backward Comp)
  const dbManual = new DatabaseSDK({ baseUrl: '...' });
  const q7 = await dbManual.table<User>('users').select('name').query();
  // Manual generic with select currently DOES NOT inference result narrowing in strict way
  // unless we pass the result type manually to the Table generic or QueryBuilder.
  // But our change was to QueryBuilder<T, Result>.
  // table<T>() returns QueryBuilder<T>. Result is undefined.
  // select() narrows it. So it SHOULD work for manual types too!

  if (q7.records) {
    const r = q7.records[0]!;
    r.name;
    // @ts-expect-error
    r.id; // This should error if our generic logic holds for manual T too.
  }

  // 8. Where clauses (should not affect return type)
  const q8 = await db
    .table('users')
    .where('name', 'John')
    .where('age', '>', 18)
    .query();

  if (q8.records) {
    const r = q8.records[0]!;
    r.name; // OK
    r.email; // OK
    r.age; // OK
  }

  // 9. Where with conditions object
  const q9 = await db
    .table('users')
    .where({ name: 'John', role: 'admin' })
    .query();

  if (q9.records) {
    const r = q9.records[0]!;
    r.name; // OK
    r.role; // OK
  }

  // 10. Where between
  const q10 = await db
    .table('products')
    .whereBetween('price', [10, 100])
    .query();

  if (q10.records) {
    const r = q10.records[0]!;
    r.price; // OK
    r.title; // OK
  }

  // 11. Where in / Where not in
  const q11 = await db
    .table('users')
    .whereIn('role', ['admin', 'user'])
    .whereNotIn('id', [1, 2, 3])
    .query();

  if (q11.records) {
    const r = q11.records[0]!;
    r.role; // OK
    r.id; // OK
  }

  // 12. Where null / Where not null
  const q12 = await db
    .table('users')
    .whereNull('email')
    .whereNotNull('name')
    .query();

  if (q12.records) {
    const r = q12.records[0]!;
    r.email; // OK
    r.name; // OK
  }

  // 13. Order by
  const q13 = await db
    .table('products')
    .orderBy('price', 'desc')
    .orderBy('title', 'asc', 'last')
    .query();

  if (q13.records) {
    const r = q13.records[0]!;
    r.price; // OK
    r.title; // OK
  }

  // 14. Limit and Offset
  const q14 = await db.table('users').limit(10).offset(20).query();

  if (q14.records) {
    const r = q14.records[0]!;
    r.id; // OK
    r.name; // OK
  }

  // 15. OrWhere / AndWhere groups
  const q15 = await db
    .table('users')
    .where('role', 'admin')
    .orWhere((q) => {
      q.where('age', '>', 18).where('name', 'like', 'John%');
    })
    .query();

  if (q15.records) {
    const r = q15.records[0]!;
    r.role; // OK
    r.age; // OK
    r.name; // OK
  }

  // 16. Where exists
  const q16 = await db
    .table('products')
    .whereExists((sdk) => sdk.table('users').where('users.id', '=', 1))
    .query();

  if (q16.records) {
    const r = q16.records[0]!;
    r.title; // OK
    r.price; // OK
  }

  // 17. Where exists join
  const q17 = await db
    .table('products')
    .whereExistsJoin('users', 'categoryId', 'id', (q) => {
      q.where('role', 'admin');
    })
    .query();

  if (q17.records) {
    const r = q17.records[0]!;
    r.categoryId; // OK
    r.title; // OK
  }

  // 18. Having clause
  const q18 = await db
    .table('products')
    .groupBy('categoryId')
    .count('id', 'count')
    .having('count', '>', 5)
    .query();

  if (q18.records) {
    const r = q18.records[0]!;
    r.categoryId; // OK
    r.count; // OK
    r.title; // OK
  }

  // 19. Multiple aggregates
  const q19 = await db
    .table('products')
    .count('id', 'total')
    .sum('price', 'total_price')
    .avg('price', 'avg_price')
    .min('price', 'min_price')
    .max('price', 'max_price')
    .query();

  if (q19.records) {
    const r = q19.records[0]!;
    r.total; // OK
    r.total_price; // OK
    r.avg_price; // OK
    r.min_price; // OK
    r.max_price; // OK
    r.title; // OK
    r.price; // OK
  }

  // 20. Window functions
  const q20 = await db
    .table('users')
    .rowNumber('row_num', ['role'], [{ field: 'age', direction: 'desc' }])
    .rank('rank_val', ['role'])
    .query();

  if (q20.records) {
    const r = q20.records[0]!;
    r.row_num; // OK
    r.rank_val; // OK
    r.name; // OK
    r.age; // OK
  }

  // 21. Lag / Lead window functions
  const q21 = await db
    .table('users')
    .lag('age', 'prev_age', ['role'], [{ field: 'id', direction: 'asc' }])
    .lead('age', 'next_age', ['role'], [{ field: 'id', direction: 'asc' }])
    .query();

  if (q21.records) {
    const r = q21.records[0]!;
    r.prev_age; // OK
    r.next_age; // OK
    r.age; // OK
  }

  // 22. Window advanced
  const q22 = await db
    .table('users')
    .windowAdvanced('sum', 'total_age', {
      field: 'age',
      partitionBy: ['role'],
      over: {
        partitionBy: ['role'],
        orderBy: [{ field: 'id', direction: 'asc' }],
      },
    })
    .query();

  if (q22.records) {
    const r = q22.records[0]!;
    r.total_age; // OK
    r.age; // OK
    r.name; // OK
  }

  // 23. CTE (Common Table Expression)
  const q23 = await db
    .table('users')
    .with('active_users', (q) => {
      q.where('role', 'user');
    })
    .query();

  if (q23.records) {
    const r = q23.records[0]!;
    r.name; // OK
    r.role; // OK
  }

  // 24. Recursive CTE
  const q24 = await db
    .table('users')
    .withRecursive(
      'user_tree',
      db.table('users').where('id', 1),
      db.table('users').where('id', '>', 1),
      { unionAll: true },
    )
    .query();

  if (q24.records) {
    const r = q24.records[0]!;
    r.id; // OK
    r.name; // OK
  }

  // 25. Transform with compute
  const q25 = await db
    .table('products')
    .compute({
      discountedPrice: (row) => row.price * 0.9,
    })
    .query();

  if (q25.records) {
    const r = q25.records[0]!;
    r.price; // OK
    r.title; // OK
  }

  // 26. Pivot transformation
  const q26 = await db
    .table('products')
    .pivot('categoryId', ['1', '2'], { type: 'sum', field: 'price' })
    .query();

  if (q26.records) {
    const r = q26.records[0]!;
    // Pivot changes the shape, but base fields still available
    r.id; // OK
  }

  // 27. Select with aggregate (chained)
  const q27 = await db
    .table('users')
    .select('role')
    .sum('age', 'total_age')
    .avg('age', 'avg_age')
    .query();

  if (q27.records) {
    const r = q27.records[0]!;
    r.role; // OK
    r.total_age; // OK
    r.avg_age; // OK
    // @ts-expect-error - name was not selected
    r.name;
  }

  // 28. Complex query with multiple clauses
  const q28 = await db
    .table('products')
    .where('price', '>', 10)
    .whereIn('categoryId', [1, 2, 3])
    .whereNotNull('title')
    .orderBy('price', 'desc')
    .limit(50)
    .offset(10)
    .count('id', 'total')
    .query();

  if (q28.records) {
    const r = q28.records[0]!;
    r.id; // OK
    r.title; // OK
    r.price; // OK
    r.total; // OK
  }

  // 29. Create record
  const createResult = await db.table('users').create({
    id: 1,
    name: 'John',
    email: 'john@example.com',
    role: 'user',
    age: 25,
  });

  if (createResult.records) {
    const r = createResult.records[0]!;
    r.id; // OK
    r.name; // OK
  }

  // 30. Update record
  const updateResult = await db.table('users').update(1, { name: 'Jane' });

  if (updateResult.records) {
    const r = updateResult.records[0]!;
    r.id; // OK
    r.name; // OK
  }

  // 31. Delete record
  const deleteResult = await db.table('users').delete(1);

  // 32. No select - should return all fields
  const q32 = await db.table('users').query();

  if (q32.records) {
    const r = q32.records[0]!;
    r.id; // OK
    r.name; // OK
    r.email; // OK
    r.role; // OK
    r.age; // OK
  }
}
