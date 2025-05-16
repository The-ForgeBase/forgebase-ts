/* eslint-disable @typescript-eslint/ban-ts-comment */
import { WebSocket as _WebSocket } from 'ws';

// @ts-ignore
const Websocket: typeof globalThis.WebSocket =
  globalThis.WebSocket || _WebSocket;

export default Websocket;
