import { DatabaseSDK } from './client';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  salary: number;
  hireDate: Date;
  status: string;
  experience: number;
  lastName: string;
}

interface Order {
  id: number;
  userId: number;
  total: number;
  status: string;
  createdAt: Date;
  revenue: number;
}

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  stock: number;
}

// Initialize SDK
const db = new DatabaseSDK('http://localhost:3000');

// Helper function to run examples
async function runExample(name: string, fn: () => Promise<any>) {
  console.log(`\n=== Running ${name} ===`);
  try {
    const result = await fn();
    console.log(`✅ ${name} completed successfully`);
    displayResults(name, result);
  } catch (error) {
    console.error(`❌ ${name} failed:`, error);
  }
}

// Function to display results
function displayResults(name: string, data: any) {
  console.log(`\n📋 Results for ${name}:`);
  console.log(JSON.stringify(data, null, 2));
}

// Main function to run examples
async function main() {
  // await runExample("Basic Queries", basicQueries);
  // await runExample("Advanced Filtering", advancedFiltering);
  // await runExample("Aggregations and Grouping", aggregationsAndGrouping);
  // await runExample("Window Functions", windowFunctions);
  await runExample('CTEs', cteExamples);
  // await runExample("Transformations", transformations);
  // await runExample("Complex Real-World Examples", realWorldExamples);
}

// Basic Queries
async function basicQueries() {
  const results = {
    activeUsers: await db
      .table<User>('users')
      .where('status', 'active')
      .execute(),

    seniorManagers: await db
      .table<User>('users')
      .where('role', 'manager')
      .where('experience', '>=', 5)
      .execute(),

    sortedUsers: await db
      .table<User>('users')
      .orderBy('lastName', 'asc')
      .orderBy({ field: 'salary', direction: 'desc', nulls: 'first' })
      .execute(),

    pagedResults: await db.table<User>('users').offset(20).limit(10).execute(),

    userEmails: await db
      .table<User>('users')
      .select('id', 'email')
      .where('status', 'active')
      .execute(),

    rankedSalaries: await db
      .table<User>('users')
      .select('firstName', 'department', 'salary')
      .window('rank', 'salary_rank', {
        partitionBy: ['department'],
        orderBy: [{ field: 'salary', direction: 'desc' }],
      })
      .execute(),

    departmentStats: await db
      .table<User>('users')
      .select('department')
      .groupBy('department')
      .count('id', 'total_employees')
      .avg('salary', 'avg_salary')
      .execute(),
  };

  return results;
}

// Aggregations and Grouping
async function aggregationsAndGrouping() {
  // Basic aggregation
  const orderStats = await db
    .table<Order>('orders')
    .groupBy('status')
    .count('id', 'order_count')
    .sum('total', 'total_amount')
    .avg('total', 'average_amount')
    .execute();

  // Having clause
  const highValueOrderGroups = await db
    .table<Order>('orders')
    .groupBy('userId')
    .having('total_amount', '>', 1000)
    .sum('total', 'total_amount')
    .execute();

  // Multiple aggregations with complex grouping
  const detailedStats = await db
    .table<Order>('orders')
    .groupBy('department', 'status')
    .count('id', 'order_count')
    .sum('total', 'revenue')
    .avg('total', 'avg_order_value')
    .min('total', 'min_order')
    .max('total', 'max_order')
    .having('order_count', '>', 1)
    .orderBy('revenue', 'desc')
    .execute();

  return { orderStats, highValueOrderGroups, detailedStats };
}

// Window Functions
async function windowFunctions() {
  // Row number
  const rankedUsers = await db
    .table<User>('users')
    .select('firstName', 'department', 'salary')
    .rowNumber('rank', ['department'], [{ field: 'salary', direction: 'desc' }])
    .execute();

  // Multiple window functions
  const analyzedSalaries = await db
    .table<User>('users')
    .select('firstName', 'department', 'salary')
    .window('rank', 'salary_rank', {
      partitionBy: ['department'],
      orderBy: [{ field: 'salary', direction: 'desc' }],
    })
    .window('lag', 'prev_salary', {
      field: 'salary',
      partitionBy: ['department'],
      orderBy: [{ field: 'hireDate', direction: 'asc' }],
    })
    .execute();

  // Advanced window function
  const advancedAnalysis = await db
    .table<User>('users')
    .select('id', 'firstName', 'lastName', 'department', 'salary', 'hireDate')
    .windowAdvanced('sum', 'running_total', {
      field: 'salary',
      over: {
        partitionBy: ['department'],
        orderBy: [{ field: 'hireDate', direction: 'asc' }],
        frame: {
          type: 'ROWS',
          start: 'UNBOUNDED PRECEDING',
          end: 'CURRENT ROW',
        },
      },
    })
    .orderBy('department', 'asc')
    .orderBy('hireDate', 'asc')
    .execute();

  return { advancedAnalysis, rankedUsers, analyzedSalaries };
}

// Advanced Filtering
async function advancedFiltering() {
  // Complex grouped conditions
  const filteredUsers = await db
    .table<User>('users')
    .where('status', 'active')
    .andWhere((query) => {
      query.where('role', 'admin').orWhere((subQuery) => {
        subQuery.where('role', 'manager').where('department', 'IT');
      });
    })
    .execute();

  // Where between
  const salaryRange = await db
    .table<User>('users')
    .whereBetween('salary', [50000, 100000])
    .execute();

  // Where in
  const specificDepts = await db
    .table<User>('users')
    .whereIn('department', ['IT', 'HR', 'Finance'])
    .execute();

  // Where exists
  // TODO: needs fixing in the sdk to prevent SQL injection
  // const usersWithOrders = await db
  //   .table<User>("users")
  //   .whereExists(
  //     "SELECT 1 FROM orders WHERE orders.user_id = users.id AND total > ?",
  //     [1000]
  //   )
  //   .execute();

  return { filteredUsers, salaryRange, specificDepts };
}

// CTEs (Common Table Expressions)
//TODO: not yet working well on the server side
async function cteExamples() {
  // Simple CTE
  const highPaidUsers = db.table<User>('users').where('salary', '>', 100000);

  const result = await db
    .table<User>('users')
    .with('high_paid', highPaidUsers)
    .execute();

  // Recursive CTE
  const initialQuery = db
    .table<Product>('products')
    .where('category', 'Electronics');

  const recursiveQuery = db
    .table<Product>('products')
    .where('price', '>', 1000);

  const recursiveResult = await db
    .table<Product>('products')
    .withRecursive('product_hierarchy', initialQuery, recursiveQuery, {
      unionAll: true,
    })
    .execute();

  return { result, recursiveResult };
}

async function transformations() {
  // Implement transformations example
  return [];
}

async function realWorldExamples() {
  // Implement complex real-world example
  return [];
}

// // Update the module execution check for ES modules
// const isMainModule = import.meta.url === `file://${process.argv[1]}`;

// if (isMainModule) {
//   main().catch((error) => {
//     console.error("Error running examples:", error);
//     process.exit(1);
//   });
// }

// Export the examples for individual running
export const examples = {
  basicQueries,
  advancedFiltering,
  aggregationsAndGrouping,
  windowFunctions,
  cteExamples,
  transformations,
  realWorldExamples,
};
