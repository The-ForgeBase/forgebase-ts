import { Hooks } from '../lib/crossws';
import crossws, { BunAdapter, BunOptions } from '../lib/crossws/adapters/bun';
import { setupWSConnection } from '../lib/yjs';

const createBunRealTimeAdapter = (
  hooks: Partial<Hooks>,
  options: BunOptions
): BunAdapter => {
  const ws = crossws({
    hooks: {
      open(connect) {
        setupWSConnection(connect.websocket, connect.request);
      },
      ...hooks,
    },
    ...options,
  });

  return ws;
};

export default createBunRealTimeAdapter;
