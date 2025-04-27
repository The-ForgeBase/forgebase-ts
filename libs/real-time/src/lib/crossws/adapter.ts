import type { Hooks, ResolveHooks } from './hooks';

// --- types ---

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AdapterInstance {} // eslint-disable-line @typescript-eslint/no-empty-interface

export interface AdapterOptions {
  resolve?: ResolveHooks;
  hooks?: Partial<Hooks>;
}

export type Adapter<
  AdapterT extends AdapterInstance = AdapterInstance,
  Options extends AdapterOptions = AdapterOptions
> = (options?: Options) => AdapterT;

export function defineWebSocketAdapter<
  AdapterT extends AdapterInstance = AdapterInstance,
  Options extends AdapterOptions = AdapterOptions
>(factory: Adapter<AdapterT, Options>): Adapter<AdapterT, Options> {
  return factory;
}
