// Core exports
export * from './auth';
export * from './types';

// Plugin exports
export * from './plugins/base-auth-plugin';
export { default as EmailPasswordAuth } from './plugins/email-password/email-password.plugin';
export { default as StandardSchemaAuth } from '../examples/standard-schema-example/standard-schema-auth.plugin';

// Utility exports
export * from './utils';

// Version export
export const version = '0.1.0-alpha.1';
