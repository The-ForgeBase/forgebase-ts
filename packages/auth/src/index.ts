// Existing core exports
export * from './authManager';
export * from './types';
export * from './config';
export * from './userService';
export * from './session';
export * from './lib/password';
export * from './lib/sanitize';

// User table extension utilities
export * from './utils';

// Provider exports
export * from './providers';

// Admin exports
export { InternalAdminManager } from './admin';
export * from './services';
export * from './plugins';
export * from './container';

export const version = '0.0.1';
