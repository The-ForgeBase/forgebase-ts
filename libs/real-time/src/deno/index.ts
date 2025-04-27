import { Hooks } from '../lib/crossws';
import crossws, {
  DenoAdapter,
  DenoOptions,
} from '../lib/crossws/adapters/deno';
import { setupWSConnection } from '../lib/yjs';

const createDenoRealTimeAdapter = (
  hooks: Partial<Hooks>,
  options: DenoOptions
): DenoAdapter => {
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

export default createDenoRealTimeAdapter;
