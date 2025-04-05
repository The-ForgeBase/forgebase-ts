// Existing core exports
export * from './authManager';
export * from './types';
export * from './config';
export * from './userService';
export * from './session';
export * from './session/session';
export * from './session/jwt';
export * from './session/jose-jwt'; // Export the new JoseJwtSessionManager
export * from './utils/token-verifier'; // Export TokenVerifier for external services
export * from './lib/password';
export * from './lib/sanitize';

// Provider exports
export * from './providers';

// Export adapters
export * from './adapters/express';
export * from './adapters/hono';
export * from './adapters/nest';

// Admin exports
export { createInternalAdminManager, InternalAdminManager } from './admin';
export * from './services';
export * from './plugins';
