/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { AdapterOptions, AdapterInstance, Adapter } from '../adapter';
import { AdapterHookable } from '../hooks';

import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer as _WebSocketServer } from 'ws';
import type {
  ServerOptions,
  WebSocketServer,
  WebSocket as WebSocketT,
} from '../types/ws';
import { Connect } from '../connect';
import { toBufferLike } from '../utils';
import { WSError } from '../error';
import { Message } from '../message';

// --- types ---

type AugmentedReq = IncomingMessage & {
  _request: NodeReqProxy;
  _upgradeHeaders?: HeadersInit;
  _context: Record<string, unknown>;
};

export interface NodeAdapter extends AdapterInstance {
  handleUpgrade(
    req: IncomingMessage,
    socket: Duplex,
    head: Buffer
  ): Promise<void>;
  closeAll: (code?: number, data?: string | Buffer) => void;
}

export interface NodeOptions extends AdapterOptions {
  wss?: WebSocketServer;
  serverOptions?: ServerOptions;
}

// --- adapter ---

// https://github.com/websockets/ws
// https://github.com/websockets/ws/blob/master/doc/ws.md
const nodeAdapter: Adapter<NodeAdapter, NodeOptions> = (options = {}) => {
  const hooks = new AdapterHookable(options);

  const wss: WebSocketServer =
    options.wss ||
    (new _WebSocketServer({
      noServer: true,
      ...(options.serverOptions as any),
    }) as unknown as WebSocketServer);

  wss.on('connection', (ws, nodeReq) => {
    const request = new NodeReqProxy(nodeReq);
    const connect = new NodeConnect({
      request,
      nodeReq,
      ws,
    });
    hooks.callHook('open', connect);
    ws.on('message', (data: unknown) => {
      if (Array.isArray(data)) {
        data = Buffer.concat(data);
      }
      hooks.callHook('message', connect, new Message(data, connect));
    });
    ws.on('error', (error: Error) => {
      hooks.callHook('error', connect, new WSError(error));
    });
    ws.on('close', (code: number, reason: Buffer) => {
      hooks.callHook('close', connect, {
        code,
        reason: reason?.toString(),
      });
    });
  });

  wss.on('headers', (outgoingHeaders, req) => {
    const upgradeHeaders = (req as AugmentedReq)._upgradeHeaders;
    if (upgradeHeaders) {
      for (const [key, value] of new Headers(upgradeHeaders)) {
        outgoingHeaders.push(`${key}: ${value}`);
      }
    }
  });

  return {
    handleUpgrade: async (nodeReq, socket, head) => {
      const request = new NodeReqProxy(nodeReq);

      const { upgradeHeaders, endResponse, context } = await hooks.upgrade(
        request
      );
      if (endResponse) {
        return sendResponse(socket, endResponse);
      }

      (nodeReq as AugmentedReq)._request = request;
      (nodeReq as AugmentedReq)._upgradeHeaders = upgradeHeaders;
      (nodeReq as AugmentedReq)._context = context;
      wss.handleUpgrade(nodeReq, socket, head, (ws) => {
        wss.emit('connection', ws, nodeReq);
      });
    },
    closeAll: (code, data) => {
      for (const client of wss.clients) {
        client.close(code, data);
      }
    },
  };
};

export default nodeAdapter;

class NodeConnect extends Connect<{
  request: NodeReqProxy;
  nodeReq: IncomingMessage;
  ws: WebSocketT & { _peer?: NodeConnect };
}> {
  override get remoteAddress() {
    return this._internal.nodeReq.socket?.remoteAddress;
  }

  override get context() {
    return (this._internal.nodeReq as AugmentedReq)._context;
  }

  send(data: unknown, options?: { compress?: boolean }) {
    const dataBuff = toBufferLike(data);
    const isBinary = typeof dataBuff !== 'string';
    this._internal.ws.send(dataBuff, {
      compress: options?.compress,
      binary: isBinary,
      ...options,
    });
    return 0;
  }

  close(code?: number, data?: string | Buffer) {
    this._internal.ws.close(code, data);
  }

  override terminate() {
    this._internal.ws.terminate();
  }
}

// --- web compat ---

class NodeReqProxy {
  _req: IncomingMessage;
  _headers?: Headers;
  _url?: string;

  constructor(req: IncomingMessage) {
    this._req = req;
  }

  get url(): string {
    if (!this._url) {
      const req = this._req;
      const host = req.headers['host'] || 'localhost';
      const isSecure =
        (req.socket as any)?.encrypted ??
        req.headers['x-forwarded-proto'] === 'https';
      this._url = `${isSecure ? 'https' : 'http'}://${host}${req.url}`;
    }
    return this._url;
  }

  get headers(): Headers {
    if (!this._headers) {
      this._headers = new Headers(this._req.headers as HeadersInit);
    }
    return this._headers;
  }
}

async function sendResponse(socket: Duplex, res: Response) {
  const head = [
    `HTTP/1.1 ${res.status || 200} ${res.statusText || ''}`,
    ...[...res.headers.entries()].map(
      ([key, value]) =>
        `${encodeURIComponent(key)}: ${encodeURIComponent(value)}`
    ),
  ];
  socket.write(head.join('\r\n') + '\r\n\r\n');
  if (res.body) {
    for await (const chunk of res.body) {
      socket.write(chunk);
    }
  }
  return new Promise<void>((resolve) => {
    socket.end(resolve);
  });
}
