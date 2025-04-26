/**
 * Custom error classes for the database library
 */

/**
 * Base error class for database errors
 */
export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ExcludedTableError extends DatabaseError {
  constructor(tableName: string) {
    super(`This Table "${tableName}" is on the excluded list`);
    this.name = 'ExcludedTableError';
  }
}

/**
 * Error thrown when authentication is required but not provided
 */
export class AuthenticationRequiredError extends DatabaseError {
  constructor(message = 'Authentication required to access this resource') {
    super(message);
    this.name = 'AuthenticationRequiredError';
  }
}

/**
 * Error thrown when a user doesn't have permission to perform an operation
 */
export class PermissionDeniedError extends DatabaseError {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

/**
 * Error thrown when there's an issue with the database schema
 */
export class SchemaError extends DatabaseError {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaError';
  }
}

/**
 * Error thrown when there's an issue with a database query
 */
export class QueryError extends DatabaseError {
  constructor(message: string) {
    super(message);
    this.name = 'QueryError';
  }
}
