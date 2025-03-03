# sdk

This library was generated with [Nx](https://nx.dev).

## Building

Run `nx build sdk` to build the library.

## Running unit tests

Run `nx test sdk` to execute the unit tests via [Jest](https://jestjs.io).

database help me fix the whereExists method, check both the server and client folder to properly understand the code

// Where exists

// TODO: needs fixing in the sdk to prevent SQL injection

// const usersWithOrders = await db

//   .table<User>("users")

//   .whereExists(

//     "SELECT 1 FROM orders WHERE orders.user_id = users.id AND total > ?",

//     [1000]

//   )

//   .execute();
