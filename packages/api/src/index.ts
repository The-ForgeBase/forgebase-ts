import { ForgeApi } from "./core/api.js";
import { BaaSConfig } from "./types.js";

export function forgeApi(config?: Partial<BaaSConfig>): ForgeApi {
  return new ForgeApi(config);
}

export * from "./types.js";
export * from "./frameworks/index.js";
export * from "./adapters/adapterFactory.js";
