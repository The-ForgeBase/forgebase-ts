import { Api } from "./core/api";
import { BaaSConfig } from "./types";

export function api(config?: Partial<BaaSConfig>): Api {
  return new Api(config);
}
