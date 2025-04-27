/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { WebSocketHandler, ServerWebSocket, Server } from 'bun';
import type { AdapterOptions, AdapterInstance, Adapter } from '../adapter';
import { toBufferLike } from '../utils';
import { AdapterHookable } from '../hooks';
import { Message } from '../message';
import { Connect } from '../connect';

// --- types ---

export interface BunAdapter extends AdapterInstance {
  websocket: WebSocketHandler<ContextData>;
  handleUpgrade(req: Request, server: Server): Promise<Response | undefined>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BunOptions extends AdapterOptions {} // eslint-disable-line @typescript-eslint/no-empty-interface

type ContextData = {
  connect?: BunConnect;
  request: Request;
  server?: Server;
  context: Connect['context'];
};

// --- adapter ---

// https://bun.sh/docs/api/websockets
const bunAdapter: Adapter<BunAdapter, BunOptions> = (options = {}) => {
  const hooks = new AdapterHookable(options);
  return {
    async handleUpgrade(request, server) {
      const { upgradeHeaders, endResponse, context } = await hooks.upgrade(
        request
      );
      if (endResponse) {
        return endResponse;
      }
      const upgradeOK = server.upgrade(request, {
        data: {
          server,
          request,
          context,
        } satisfies ContextData,
        headers: upgradeHeaders,
      });

      if (!upgradeOK) {
        return new Response('Upgrade failed', { status: 500 });
      }
    },
    websocket: {
      message: (ws, message) => {
        const connect = getPeer(ws);
        hooks.callHook('message', connect, new Message(message, connect));
      },
      open: (ws) => {
        const connect = getPeer(ws);
        hooks.callHook('open', connect);
      },
      close: (ws, code, reason) => {
        const connect = getPeer(ws);
        hooks.callHook('close', connect, { code, reason });
      },
    },
  };
};

export default bunAdapter;

// --- peer ---

function getPeer(ws: ServerWebSocket<ContextData>): BunConnect {
  if (ws.data?.connect) {
    return ws.data.connect;
  }
  const connect = new BunConnect({ ws, request: ws.data.request });
  ws.data = {
    ...ws.data,
    connect,
  };
  return connect;
}

class BunConnect extends Connect<{
  ws: ServerWebSocket<ContextData>;
  request: Request;
}> {
  override get remoteAddress(): string {
    return this._internal.ws.remoteAddress;
  }

  override get context(): Connect['context'] {
    return this._internal.ws.data.context;
  }

  send(data: unknown, options?: { compress?: boolean }): number {
    // @ts-ignore
    return this._internal.ws.send(toBufferLike(data), options?.compress);
  }

  close(code?: number, reason?: string): void {
    this._internal.ws.close(code, reason);
  }

  override terminate(): void {
    this._internal.ws.terminate();
  }
}
