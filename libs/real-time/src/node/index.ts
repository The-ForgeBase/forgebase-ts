import { Hooks } from '../lib/crossws';
import crossws, {
  NodeAdapter,
  NodeOptions,
} from '../lib/crossws/adapters/node';
import { setupWSConnection } from '../lib/yjs';

const createNodeRealTimeAdapter = (
  hooks: Partial<Hooks>,
  options: NodeOptions
): NodeAdapter => {
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

export default createNodeRealTimeAdapter;
