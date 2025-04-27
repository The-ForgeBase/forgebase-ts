import http from 'http';
import * as number from 'lib0/number';
import { WSSharedDoc } from './yjs';
import * as Y from 'yjs';

// Type definitions
interface CallbackData {
  room: string;
  data: Record<
    string,
    {
      type: string;
      content: unknown;
    }
  >;
}

interface CallbackObjects {
  [key: string]: string;
}

// Constants
const CALLBACK_URL = process.env.CALLBACK_URL
  ? new URL(process.env.CALLBACK_URL)
  : null;
const CALLBACK_TIMEOUT = number.parseInt(
  process.env.CALLBACK_TIMEOUT || '5000'
);
const CALLBACK_OBJECTS: CallbackObjects = process.env.CALLBACK_OBJECTS
  ? JSON.parse(process.env.CALLBACK_OBJECTS)
  : {};

export const isCallbackSet = !!CALLBACK_URL;

/**
 * Handle callbacks for document updates
 */
export const callbackHandler = (doc: WSSharedDoc): void => {
  const room = doc.name;
  const dataToSend: CallbackData = {
    room,
    data: {},
  };

  const sharedObjectList = Object.keys(CALLBACK_OBJECTS);
  sharedObjectList.forEach((sharedObjectName) => {
    const sharedObjectType = CALLBACK_OBJECTS[sharedObjectName];
    dataToSend.data[sharedObjectName] = {
      type: sharedObjectType,
      content: getContent(sharedObjectName, sharedObjectType, doc).toJSON(),
    };
  });

  if (CALLBACK_URL) {
    callbackRequest(CALLBACK_URL, CALLBACK_TIMEOUT, dataToSend);
  }
};

/**
 * Send a callback request to the specified URL
 */
const callbackRequest = (
  url: URL,
  timeout: number,
  data: CallbackData
): void => {
  const dataString = JSON.stringify(data);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    timeout,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(dataString),
    },
  };

  const req = http.request(options);
  req.on('timeout', () => {
    console.warn('Callback request timed out.');
    req.destroy();
  });

  req.on('error', (e: Error) => {
    console.error('Callback request error.', e);
    req.destroy();
  });

  req.write(dataString);
  req.end();
};

/**
 * Get the content of a shared object from a document
 */
const getContent = (
  objName: string,
  objType: string,
  doc: WSSharedDoc
): Y.AbstractType<unknown> => {
  switch (objType) {
    case 'Array':
      return doc.getArray(objName);
    case 'Map':
      return doc.getMap(objName);
    case 'Text':
      return doc.getText(objName);
    case 'XmlFragment':
      return doc.getXmlFragment(objName);
    case 'XmlElement':
      return doc.getXmlElement(objName);
    default:
      // This is a fallback that should never be reached in practice
      return {} as Y.AbstractType<unknown>;
  }
};
