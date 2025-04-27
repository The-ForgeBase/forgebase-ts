/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { AdapterOptions, AdapterInstance, Adapter } from '../adapter.ts';
import type { WebSocket } from '../types/web';
import type uws from 'uWebSockets.js';
import { toBufferLike } from '../utils';
import { AdapterHookable } from '../hooks';
import { Message } from '../message';
import { Connect } from '../connect';

// --- types ---

type UserData = {
  connect?: UWSConnect;
  req: uws.HttpRequest;
  res: uws.HttpResponse;
  protocol: string;
  extensions: string;
  context: Connect['context'];
};

type WebSocketHandler = uws.WebSocketBehavior<UserData>;

export interface UWSAdapter extends AdapterInstance {
  websocket: WebSocketHandler;
}

export interface UWSOptions extends AdapterOptions {
  uws?: Exclude<
    uws.WebSocketBehavior<any>,
    | 'close'
    | 'drain'
    | 'message'
    | 'open'
    | 'ping'
    | 'pong'
    | 'subscription'
    | 'upgrade'
  >;
}

// --- adapter ---

// https://github.com/websockets/ws
// https://github.com/websockets/ws/blob/master/doc/ws.md
const uwsAdapter: Adapter<UWSAdapter, UWSOptions> = (options = {}) => {
  const hooks = new AdapterHookable(options);
  return {
    websocket: {
      ...options.uws,
      close(ws, code, message) {
        const connect = getPeer(ws);
        (
          (connect as any)._internal.ws as UwsWebSocketProxy
        ).readyState = 2 /* CLOSING */;
        hooks.callHook('close', connect, {
          code,
          reason: message?.toString(),
        });
        (
          (connect as any)._internal.ws as UwsWebSocketProxy
        ).readyState = 3 /* CLOSED */;
      },
      message(ws, message, isBinary) {
        const connect = getPeer(ws);
        hooks.callHook('message', connect, new Message(message, connect));
      },
      open(ws) {
        const connect = getPeer(ws);
        hooks.callHook('open', connect);
      },
      async upgrade(res, req, uwsContext) {
        let aborted = false;
        res.onAborted(() => {
          aborted = true;
        });

        const { upgradeHeaders, endResponse, context } = await hooks.upgrade(
          new UWSReqProxy(req)
        );
        if (endResponse) {
          res.writeStatus(`${endResponse.status} ${endResponse.statusText}`);
          for (const [key, value] of endResponse.headers) {
            res.writeHeader(key, value);
          }
          if (endResponse.body) {
            for await (const chunk of endResponse.body) {
              if (aborted) break;
              res.write(chunk);
            }
          }
          if (!aborted) {
            res.end();
          }
          return;
        }

        if (aborted) {
          return;
        }

        res.writeStatus('101 Switching Protocols');
        if (upgradeHeaders) {
          // prettier-ignore
          const headers = upgradeHeaders instanceof Headers ? upgradeHeaders : new Headers(upgradeHeaders);
          for (const [key, value] of headers) {
            res.writeHeader(key, value);
          }
        }

        res.cork(() => {
          const key = req.getHeader('sec-websocket-key');
          const protocol = req.getHeader('sec-websocket-protocol');
          const extensions = req.getHeader('sec-websocket-extensions');
          res.upgrade(
            {
              req,
              res,
              protocol,
              extensions,
              context,
            },
            key,
            protocol,
            extensions,
            uwsContext
          );
        });
      },
    },
  };
};

export default uwsAdapter;

// --- connect ---

function getPeer(uws: uws.WebSocket<UserData>): UWSConnect {
  const uwsData = uws.getUserData();
  if (uwsData.connect) {
    return uwsData.connect;
  }
  const connect = new UWSConnect({
    uws,
    ws: new UwsWebSocketProxy(uws),
    request: new UWSReqProxy(uwsData.req),
    uwsData,
  });
  uwsData.connect = connect;
  return connect;
}

class UWSConnect extends Connect<{
  request: UWSReqProxy;
  uws: uws.WebSocket<UserData>;
  ws: UwsWebSocketProxy;
  uwsData: UserData;
}> {
  override get remoteAddress(): string | undefined {
    try {
      const addr = new TextDecoder().decode(
        this._internal.uws.getRemoteAddressAsText()
      );
      return addr;
    } catch {
      // Error: Invalid access of closed uWS.WebSocket/SSLWebSocket.
    }
  }

  override get context(): Record<string, unknown> {
    return this._internal.uwsData.context;
  }

  send(data: unknown, options?: { compress?: boolean }): number {
    const dataBuff = toBufferLike(data);
    const isBinary = typeof dataBuff !== 'string';
    // @ts-ignore
    return this._internal.uws.send(dataBuff, isBinary, options?.compress);
  }

  close(code?: number, reason?: uws.RecognizedString): void {
    this._internal.uws.end(code, reason);
  }

  override terminate(): void {
    this._internal.uws.close();
  }
}

// --- web compat ---

class UWSReqProxy {
  private _headers?: Headers;
  private _rawHeaders: [string, string][] = [];

  url: string;

  constructor(_req: uws.HttpRequest) {
    // Headers
    let host = 'localhost';
    let proto = 'http';
    _req.forEach((key, value) => {
      if (key === 'host') {
        host = value;
      } else if (key === 'x-forwarded-proto' && value === 'https') {
        proto = 'https';
      }
      this._rawHeaders.push([key, value]);
    });
    // URL
    const query = _req.getQuery();
    const pathname = _req.getUrl();
    this.url = `${proto}://${host}${pathname}${query ? `?${query}` : ''}`;
  }

  get headers(): Headers {
    if (!this._headers) {
      this._headers = new Headers(this._rawHeaders);
    }
    return this._headers;
  }
}

class UwsWebSocketProxy implements Partial<WebSocket> {
  readyState?: number = 1 /* OPEN */;

  constructor(private _uws: uws.WebSocket<UserData>) {}

  get bufferedAmount(): number {
    return this._uws?.getBufferedAmount();
  }

  get protocol(): string {
    return this._uws?.getUserData().protocol;
  }

  get extensions(): string {
    return this._uws?.getUserData().extensions;
  }
}
