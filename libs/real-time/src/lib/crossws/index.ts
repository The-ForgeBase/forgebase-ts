// Hooks
export { defineHooks } from './hooks';
export type { Hooks, ResolveHooks } from './hooks';

// Adapter
export { defineWebSocketAdapter } from './adapter';
export type { Adapter, AdapterInstance, AdapterOptions } from './adapter';

// Message
export type { Message } from './message';

// Peer
export type { Connect as Peer } from './connect';

// Error
export type { WSError } from './error';

// Removed from 0.2.x: createCrossWS, Caller, WSRequest, CrossWS
