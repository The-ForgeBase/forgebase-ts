import { ForgeApi } from './core/api';
import { BaaSConfig } from './types';
import { createForgeApi } from './core/hono';

export function forgeApi(config?: Partial<BaaSConfig>): ForgeApi {
  return new ForgeApi(config);
}

export * from './types';
export * from './core/hono';

// Export a named function for the Hono integration
export { createForgeApi as createHonoForgeApi };
