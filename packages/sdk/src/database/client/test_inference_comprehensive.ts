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
    // @ts-expect-error
    r.title;
    // @ts-expect-error
    r.price;
  }

  // 3. Aggregates extension
  const q3 = await db.table('users').count('id', 'total').query();

  if (q3.records) {
    const r = q3.records[0]!;
    r.total; // OK (number)
    // When Result includes T (no narrowing from select/groupBy), it should have T props?
    // Current logic: Result extends undefined ? {alias: number} : Result & {alias: number}
    // If Result is undefined, we return ONLY {alias: number}.
    // This implies if you JUST count, you lose the original fields from the type (which is correct for SQL aggregate queries without grouping/selection of other fields).
    // @ts-expect-error
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
    // @ts-expect-error
    r.title;
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
}
