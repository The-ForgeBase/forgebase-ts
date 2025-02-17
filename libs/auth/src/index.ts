// Core exports
export * from './adapters/framework';
export * from './config/configuration';
export * from './providers/factory';
export * from './providers/oauth';
export * from './providers/registry';
export * from './providers/builder';
export * from './lib/errors';
export * from './lib/events';
export * from './lib/service';
export * from './lib/plugins';

// Export provider registry instance
export { providerRegistry } from './providers/registry';

// Example provider registration
import { GoogleOAuthProvider } from './providers/oauth';
import { createProvider } from './providers/builder';
import { providerRegistry } from './providers/registry';

// Register built-in providers
providerRegistry.registerProvider('google', GoogleOAuthProvider);
