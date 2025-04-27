import type { AdapterOptions, AdapterInstance, Adapter } from '../adapter.ts';
import { toBufferLike } from '../utils';
import { AdapterHookable } from '../hooks';
import { Message } from '../message';
import { WSError } from '../error';
import { Connect } from '../connect.js';

import type * as _cf from '@cloudflare/workers-types';

// --- types ---

declare const WebSocketPair: typeof _cf.WebSocketPair;
declare const Response: typeof _cf.Response;

export interface CloudflareAdapter extends AdapterInstance {
  handleUpgrade(
    req: _cf.Request,
    env: unknown,
    context: _cf.ExecutionContext
  ): Promise<_cf.Response>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CloudflareOptions extends AdapterOptions {} // eslint-disable-line @typescript-eslint/no-empty-interface

// --- adapter ---

// https://developers.cloudflare.com/workers/examples/websockets/
const cloudflareAdapter: Adapter<CloudflareAdapter, CloudflareOptions> = (
  options = {}
) => {
  const hooks = new AdapterHookable(options);
  return {
    handleUpgrade: async (request, env, cfCtx) => {
      const { upgradeHeaders, endResponse, context } = await hooks.upgrade(
        request as unknown as Request
      );
      if (endResponse) {
        return endResponse as unknown as _cf.Response;
      }

      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      const connect = new CloudflareConnect({
        ws: client,
        wsServer: server,
        request: request as unknown as Request,
        cfEnv: env,
        cfCtx: cfCtx,
        context,
      });
      server.accept();
      hooks.callHook('open', connect);
      server.addEventListener('message', (event) => {
        hooks.callHook(
          'message',
          connect,
          new Message(event.data, connect, event as MessageEvent)
        );
      });
      server.addEventListener('error', (event) => {
        hooks.callHook('error', connect, new WSError(event.error));
      });
      server.addEventListener('close', (event) => {
        hooks.callHook('close', connect, event);
      });
      return new Response(null, {
        status: 101,
        webSocket: client,
        headers: upgradeHeaders,
      });
    },
  };
};

export default cloudflareAdapter;

// --- peer ---

class CloudflareConnect extends Connect<{
  ws: _cf.WebSocket;
  request: Request;
  wsServer: _cf.WebSocket;
  cfEnv: unknown;
  cfCtx: _cf.ExecutionContext;
  context: Connect['context'];
}> {
  send(data: unknown) {
    this._internal.wsServer.send(toBufferLike(data));
    return 0;
  }

  close(code?: number, reason?: string) {
    this._internal.ws.close(code, reason);
  }
}
