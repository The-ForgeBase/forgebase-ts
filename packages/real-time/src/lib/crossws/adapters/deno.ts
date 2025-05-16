import type { AdapterOptions, AdapterInstance, Adapter } from '../adapter.ts';
import { toBufferLike } from '../utils';
import { AdapterHookable } from '../hooks';
import { Message } from '../message';
import { WSError } from '../error';
import { Connect } from '../connect.js';

// --- types ---

export interface DenoAdapter extends AdapterInstance {
  handleUpgrade(req: Request, info: ServeHandlerInfo): Promise<Response>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DenoOptions extends AdapterOptions {} // eslint-disable-line @typescript-eslint/no-empty-interface

type WebSocketUpgrade = Deno.WebSocketUpgrade;
type ServeHandlerInfo = {
  remoteAddr?: { transport: string; hostname: string; port: number };
};

// --- adapter ---

// https://deno.land/api?s=WebSocket
// https://deno.land/api?s=Deno.upgradeWebSocket
// https://examples.deno.land/http-server-websocket
const denoAdapter: Adapter<DenoAdapter, DenoOptions> = (options = {}) => {
  const hooks = new AdapterHookable(options);
  return {
    handleUpgrade: async (request, info) => {
      const { upgradeHeaders, endResponse, context } = await hooks.upgrade(
        request
      );
      if (endResponse) {
        return endResponse;
      }

      const upgrade = Deno.upgradeWebSocket(request, {
        // @ts-expect-error https://github.com/denoland/deno/pull/22242
        headers: upgradeHeaders,
      });
      const connect = new BunConnect({
        ws: upgrade.socket,
        request,
        denoInfo: info,
        context,
      });
      upgrade.socket.addEventListener('open', () => {
        hooks.callHook('open', connect);
      });
      upgrade.socket.addEventListener('message', (event) => {
        hooks.callHook(
          'message',
          connect,
          new Message(event.data, connect, event)
        );
      });
      upgrade.socket.addEventListener('close', () => {
        hooks.callHook('close', connect, {});
      });
      upgrade.socket.addEventListener('error', (error) => {
        hooks.callHook('error', connect, new WSError(error));
      });
      return upgrade.response;
    },
  };
};

export default denoAdapter;

// --- peer ---

class BunConnect extends Connect<{
  ws: WebSocketUpgrade['socket'];
  request: Request;
  denoInfo: ServeHandlerInfo;
  context: Connect['context'];
}> {
  override get remoteAddress() {
    return this._internal.denoInfo.remoteAddr?.hostname;
  }

  send(data: unknown) {
    return this._internal.ws.send(toBufferLike(data));
  }

  close(code?: number, reason?: string) {
    this._internal.ws.close(code, reason);
  }

  override terminate(): void {
    (this._internal.ws as any).terminate();
  }
}
