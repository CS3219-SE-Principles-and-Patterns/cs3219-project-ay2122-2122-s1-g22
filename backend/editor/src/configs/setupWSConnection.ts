import WS from "ws";
import http from "http";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import * as mutex from "lib0/mutex";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { pub, sub } from "./pubsub";

const wsReadyStateConnecting = 0;
const wsReadyStateOpen = 1;
const wsReadyStateClosing = 2 // eslint-disable-line
const wsReadyStateClosed = 3 // eslint-disable-line

const updatesLimit = 50;

export interface DBUpdate {
  id: string;
  docname: string;
  update: Uint8Array;
}

export const messageSync = 0;
export const messageAwareness = 1;

export const pingTimeout = 30000;

export const docs = new Map<string, WSSharedDoc>();

export function cleanup() {
  docs.forEach((doc) => {
    doc.conns.forEach((_, conn) => {
      closeConn(doc, conn);
    });
  });
}

export default async function setupWSConnection(conn: WS, req: http.IncomingMessage): Promise<void> {
  conn.binaryType = "arraybuffer";
  const docname: string = req.url?.slice(1).split("?")[0] as string;
  const [doc, isNew] = getYDoc(docname);
  doc.conns.set(conn, new Set());

  conn.on("message", (message: WS.Data) => {
    messageListener(conn, req, doc, new Uint8Array(message as ArrayBuffer));
  });

  let pongReceived = true;
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      if (doc.conns.has(conn)) {
        closeConn(doc, conn);
      }
      clearInterval(pingInterval);
    } else if (doc.conns.has(conn)) {
      pongReceived = false;
      try {
        conn.ping();
      } catch (e) {
        closeConn(doc, conn);
        clearInterval(pingInterval);
      }
    }
  }, pingTimeout);

  conn.on("close", () => {
    closeConn(doc, conn);
    clearInterval(pingInterval);
  });

  conn.on("pong", () => {
    pongReceived = true;
  });

  // put the following in a variables in a block so the interval handlers don't keep them in
  // scope
  {
    // send sync step 1
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
        awarenessProtocol.encodeAwarenessUpdate(doc.awareness, Array.from(awarenessStates.keys())),
      );
      send(doc, conn, encoding.toUint8Array(encoder));
    }
  }
}

export const messageListener = async (
  conn: WS,
  req: http.IncomingMessage,
  doc: WSSharedDoc,
  message: Uint8Array,
): Promise<void> => {
  // TODO: authenticate request
  const encoder = encoding.createEncoder();
  const decoder = decoding.createDecoder(message);
  const messageType = decoding.readVarUint(decoder);
  switch (messageType) {
    case messageSync: {
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.readSyncMessage(decoder, encoder, doc, conn);
      if (encoding.length(encoder) > 1) {
        send(doc, conn, encoding.toUint8Array(encoder));
      }

      break;
    }
    case messageAwareness: {
      awarenessProtocol.applyAwarenessUpdate(doc.awareness, decoding.readVarUint8Array(decoder), conn);
      break;
    }
    default:
      throw new Error("unreachable");
  }
};

export const getYDoc = (docname: string, gc = true): [WSSharedDoc, boolean] => {
  const existing = docs.get(docname);
  if (existing) {
    return [existing, false];
  }

  const doc = new WSSharedDoc(docname);
  doc.gc = gc;

  docs.set(docname, doc);

  return [doc, true];
};

export const closeConn = (doc: WSSharedDoc, conn: WS): void => {
  const controlledIds = doc.conns.get(conn);
  if (controlledIds) {
    doc.conns.delete(conn);
    awarenessProtocol.removeAwarenessStates(doc.awareness, Array.from(controlledIds), null);

    if (doc.conns.size == 0) {
      doc.destroy();
      docs.delete(doc.name);
    }
  }

  conn.close();
};

export const send = (doc: WSSharedDoc, conn: WS, m: Uint8Array): void => {
  if (conn.readyState !== wsReadyStateConnecting && conn.readyState !== wsReadyStateOpen) {
    closeConn(doc, conn);
  }

  try {
    conn.send(m, (err) => {
      if (err) {
        closeConn(doc, conn);
      }
    });
  } catch (e) {
    closeConn(doc, conn);
  }
};

export const updateHandler = async (update: Uint8Array, origin: any, doc: WSSharedDoc): Promise<void> => {
  if (origin instanceof WS && doc.conns.has(origin)) {
    pub.publishBuffer(doc.name, Buffer.from(update)); // do not await
  }

  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeUpdate(encoder, update);
  const message = encoding.toUint8Array(encoder);
  doc.conns.forEach((_, conn) => send(doc, conn, message));
};

export class WSSharedDoc extends Y.Doc {
  name: string;
  mux: mutex.mutex;
  conns: Map<WS, Set<number>>;
  awareness: awarenessProtocol.Awareness;

  constructor(name: string) {
    super();

    this.name = name;
    this.mux = mutex.createMutex();
    this.conns = new Map();
    this.awareness = new awarenessProtocol.Awareness(this);

    const awarenessChangeHandler = (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      conn: WS,
    ) => {
      const changedClients = added.concat(updated, removed);
      if (conn) {
        const connControlledIds = this.conns.get(conn);
        added.forEach((clientId) => {
          connControlledIds?.add(clientId);
        });
        removed.forEach((clientId) => {
          connControlledIds?.delete(clientId);
        });
      }

      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients));
      const buff = encoding.toUint8Array(encoder);
      this.conns.forEach((_, c) => {
        send(this, c, buff);
      });
    };

    this.awareness.on("update", awarenessChangeHandler);
    this.on("update", updateHandler);

    sub.subscribe(this.name).then(() => {
      sub.on("messageBuffer", (channel, update) => {
        if (channel.toString() !== this.name) {
          return;
        }

        // update is a Buffer, Buffer is a subclass of Uint8Array, update can be applied
        // as an update directly
        Y.applyUpdate(this, update, sub);
      });
    });
  }

  destroy() {
    super.destroy();
    sub.unsubscribe(this.name);
  }
}