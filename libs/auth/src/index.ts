// Existing core exports
export * from './authManager';
export * from './types';
export * from './config';
export * from './userService';
export * from './session';
export * from './session/session';
export * from './session/jwt';
export * from './lib/password';
export * from './lib/sanitize';

// User table extension utilities
export * from './utils';

// Provider exports
export * from './providers';

// Export adapters
export * from './adapters/web';
export * from './adapters/nest';

// Admin exports
export { createInternalAdminManager, InternalAdminManager } from './admin';
export * from './services';
export * from './plugins';
