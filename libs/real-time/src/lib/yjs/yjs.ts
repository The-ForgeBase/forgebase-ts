/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as map from 'lib0/map';
import * as eventloop from 'lib0/eventloop';
import { LeveldbPersistence } from 'y-leveldb';
import { callbackHandler, isCallbackSet } from './callback';
import { WebSocket } from '../crossws/types/web';
import { UpgradeRequest } from '../crossws/hooks';

// Constants
const CALLBACK_DEBOUNCE_WAIT = parseInt(
  process.env.CALLBACK_DEBOUNCE_WAIT || '2000'
);
const CALLBACK_DEBOUNCE_MAXWAIT = parseInt(
  process.env.CALLBACK_DEBOUNCE_MAXWAIT || '10000'
);

const debouncer = eventloop.createDebouncer(
  CALLBACK_DEBOUNCE_WAIT,
  CALLBACK_DEBOUNCE_MAXWAIT
);

// WebSocket ready states (only using the ones we need)
const wsReadyStateConnecting = 0;
const wsReadyStateOpen = 1;
const wsReadyStateClosing = 2; // eslint-disable-line
const wsReadyStateClosed = 3; // eslint-disable-line

// Disable gc when using snapshots!
const gcEnabled = process.env.GC !== 'false' && process.env.GC !== '0';
const persistenceDir = process.env.YPERSISTENCE;

// Type definitions
interface PersistenceProvider {
  bindState: (docName: string, ydoc: WSSharedDoc) => Promise<void>;
  writeState: (docName: string, ydoc: WSSharedDoc) => Promise<any>;
  provider: unknown;
}

interface ConnectionOptions {
  docName?: string;
  gc?: boolean;
}

interface AwarenessChanges {
  added: number[];
  updated: number[];
  removed: number[];
}

// Persistence setup
let persistence: PersistenceProvider | null = null;

if (typeof persistenceDir === 'string') {
  console.info('Persisting documents to "' + persistenceDir + '"');
  const ldb = new LeveldbPersistence(persistenceDir);
  persistence = {
    provider: ldb,
    bindState: async (docName: string, ydoc: WSSharedDoc): Promise<void> => {
      const persistedYdoc = await ldb.getYDoc(docName);
      const newUpdates = Y.encodeStateAsUpdate(ydoc);
      ldb.storeUpdate(docName, newUpdates);
      Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persistedYdoc));
      ydoc.on('update', (update: Uint8Array) => {
        ldb.storeUpdate(docName, update);
      });
    },
    // Empty implementation as we don't need to write state in this case
    writeState: async (): Promise<any> => {
      // No-op
    },
  };
}

/**
 * Set the persistence layer
 */
export const setPersistence = (
  persistence_: PersistenceProvider | null
): void => {
  persistence = persistence_;
};

/**
 * Get the current persistence layer
 */
export const getPersistence = (): PersistenceProvider | null => persistence;

/**
 * Map of all active documents
 */
export const docs = new Map<string, WSSharedDoc>();

// Message types
const messageSync = 0;
const messageAwareness = 1;
// const messageAuth = 2

/**
 * Update handler for document changes
 */
const updateHandler = (
  update: Uint8Array,
  _origin: any,
  doc: WSSharedDoc,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _tr: any
): void => {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeUpdate(encoder, update);
  const message = encoding.toUint8Array(encoder);
  doc.conns.forEach((_, conn) => send(doc, conn, message));
};

/**
 * Content initializer function type
 */
type ContentInitializer = (ydoc: Y.Doc) => Promise<void>;

/**
 * Default content initializer that does nothing
 */
let contentInitializor: ContentInitializer = () => Promise.resolve();

/**
 * This function is called once every time a Yjs document is created. You can
 * use it to pull data from an external source or initialize content.
 */
export const setContentInitializor = (f: ContentInitializer): void => {
  contentInitializor = f;
};

/**
 * WebSocket shared document extending Y.Doc
 */
export class WSSharedDoc extends Y.Doc {
  public name: string;
  public conns: Map<WebSocket | Partial<WebSocket>, Set<number>>;
  public awareness: awarenessProtocol.Awareness;
  public whenInitialized: Promise<void>;

  constructor(name: string) {
    super({ gc: gcEnabled });
    this.name = name;

    // Maps from conn to set of controlled user ids
    // Delete all user ids from awareness when this conn is closed
    this.conns = new Map<WebSocket | Partial<WebSocket>, Set<number>>();

    // Initialize awareness
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);

    // Awareness change handler
    const awarenessChangeHandler = (
      { added, updated, removed }: AwarenessChanges,
      conn: WebSocket | null
    ): void => {
      const changedClients = added.concat(updated, removed);
      if (conn !== null) {
        const connControlledIDs = this.conns.get(conn);
        if (connControlledIDs !== undefined) {
          added.forEach((clientID) => {
            connControlledIDs.add(clientID);
          });
          removed.forEach((clientID) => {
            connControlledIDs.delete(clientID);
          });
        }
      }

      // Broadcast awareness update
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
      );
      const buff = encoding.toUint8Array(encoder);
      this.conns.forEach((_, c) => {
        send(this, c, buff);
      });
    };

    this.awareness.on('update', awarenessChangeHandler);
    // Type assertion needed because Y.Doc's update event has a different signature
    this.on('update', updateHandler);

    if (isCallbackSet) {
      this.on(
        'update',
        (_update: Uint8Array, _origin: unknown, doc: WSSharedDoc) => {
          debouncer(() => callbackHandler(doc));
        }
      );
    }

    this.whenInitialized = contentInitializor(this);
  }
}

/**
 * Gets a Y.Doc by name, whether in memory or on disk
 */
export const getYDoc = (docname: string, gc = true): WSSharedDoc =>
  map.setIfUndefined(docs, docname, () => {
    const doc = new WSSharedDoc(docname);
    doc.gc = gc;
    if (persistence !== null) {
      persistence.bindState(docname, doc);
    }
    docs.set(docname, doc);
    return doc;
  });

/**
 * Handle incoming messages
 */
const messageListener = (
  conn: WebSocket | Partial<WebSocket>,
  doc: WSSharedDoc,
  message: Uint8Array
): void => {
  try {
    const encoder = encoding.createEncoder();
    const decoder = decoding.createDecoder(message);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case messageSync:
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.readSyncMessage(decoder, encoder, doc, conn);

        // If the `encoder` only contains the type of reply message and no
        // message, there is no need to send the message. When `encoder` only
        // contains the type of reply, its length is 1.
        if (encoding.length(encoder) > 1) {
          send(doc, conn, encoding.toUint8Array(encoder));
        }
        break;

      case messageAwareness: {
        awarenessProtocol.applyAwarenessUpdate(
          doc.awareness,
          decoding.readVarUint8Array(decoder),
          conn
        );
        break;
      }
    }
  } catch (err) {
    console.error(err);
    // @ts-ignore
    doc.emit('error', [err]);
  }
};

/**
 * Close a connection
 */
const closeConn = (
  doc: WSSharedDoc,
  conn: WebSocket | Partial<WebSocket>
): void => {
  if (doc.conns.has(conn)) {
    const controlledIds = doc.conns.get(conn);
    if (controlledIds) {
      doc.conns.delete(conn);

      awarenessProtocol.removeAwarenessStates(
        doc.awareness,
        Array.from(controlledIds),
        null
      );

      if (doc.conns.size === 0 && persistence !== null) {
        // If persisted, we store state and destroy ydocument
        persistence.writeState(doc.name, doc).then(() => {
          doc.destroy();
        });
        docs.delete(doc.name);
      }
    }
  }
  conn.close();
};

/**
 * Send a message through a WebSocket connection
 */
const send = (
  doc: WSSharedDoc,
  conn: WebSocket | Partial<WebSocket>,
  m: Uint8Array
): void => {
  if (
    conn.readyState !== wsReadyStateConnecting &&
    conn.readyState !== wsReadyStateOpen
  ) {
    closeConn(doc, conn);
  }

  try {
    conn.send(m);
  } catch {
    // Close connection on error
    closeConn(doc, conn);
  }
};

const pingTimeout = 30000;

/**
 * Setup a WebSocket connection
 */
export const setupWSConnection = (
  conn: WebSocket | Partial<WebSocket>,
  req: UpgradeRequest,
  {
    docName = (req.url || '').slice(1).split('?')[0],
    gc = true,
  }: ConnectionOptions = {}
): void => {
  conn.binaryType = 'arraybuffer';

  // Get doc, initialize if it does not exist yet
  const doc = getYDoc(docName, gc);
  doc.conns.set(conn, new Set());

  // Listen and reply to events
  // conn.on('message', (message: ArrayBuffer) =>
  //   messageListener(conn, doc, new Uint8Array(message))
  // );
  conn.addEventListener('message', (ev: MessageEvent) => {
    if (ev.data instanceof ArrayBuffer) {
      messageListener(conn, doc, new Uint8Array(ev.data));
    }
  });

  // // Check if connection is still alive
  // let pongReceived = true;
  // const pingInterval = setInterval(() => {
  //   if (!pongReceived) {
  //     if (doc.conns.has(conn)) {
  //       closeConn(doc, conn);
  //     }
  //     clearInterval(pingInterval);
  //   } else if (doc.conns.has(conn)) {
  //     pongReceived = false;
  //     try {
  //       // ping
  //       conn.send('ping');
  //     } catch {
  //       // Close connection on ping error
  //       closeConn(doc, conn);
  //       clearInterval(pingInterval);
  //     }
  //   }
  // }, pingTimeout);

  // conn.on('close', () => {
  //   closeConn(doc, conn);
  //   clearInterval(pingInterval);
  // });
  conn.addEventListener('close', () => {
    closeConn(doc, conn);
    // clearInterval(pingInterval);
  });

  // conn.on('pong', () => {
  //   pongReceived = true;
  // });
  // conn.addEventListener('pong', () => {
  //   pongReceived = true;
  // });

  // Put the following in a block so the interval handlers don't keep it in scope
  {
    // Send sync step 1
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, doc);
    send(doc, conn, encoding.toUint8Array(encoder));

    const awarenessStates = doc.awareness.getStates();
    if (awarenessStates.size > 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
          doc.awareness,
          Array.from(awarenessStates.keys())
        )
      );
      send(doc, conn, encoding.toUint8Array(encoder));
    }
  }
};
