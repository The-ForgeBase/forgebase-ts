import { ForgeApi } from './core/api';
import { BaaSConfig } from './types';

export function forgeApi(config?: Partial<BaaSConfig>): ForgeApi {
  return new ForgeApi(config);
}

export * from './types';
export * from './frameworks/index';
export * from './adapters/adapterFactory';
