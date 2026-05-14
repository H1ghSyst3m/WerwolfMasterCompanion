import http from "node:http";
import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it } from "vitest";
import { WebSocket, WebSocketServer } from "ws";
import { RoomManager } from "./roomManager";
import { isClientMessage } from "../src/online/messages";
import type { ClientMessage, ServerMessage } from "../src/online/messages";

interface TestServer {
  url: string;
  close: () => Promise<void>;
}

type QueuedReaderItem =
  | { kind: "message"; message: ServerMessage }
  | { kind: "error"; error: Error };

const servers: TestServer[] = [];

function isServerMessage(value: unknown): value is ServerMessage {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && typeof (value as { type?: unknown }).type === "string";
}

class SocketReader {
  private readonly queue: QueuedReaderItem[] = [];
  private readonly waiters: {
    resolve: (message: ServerMessage) => void;
    reject: (error: Error) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  }[] = [];

  constructor(socket: WebSocket) {
    socket.on("message", data => {
      let message: ServerMessage;
      try {
        const parsed: unknown = JSON.parse(data.toString());
        if (!isServerMessage(parsed)) throw new Error("Malformed websocket server message");
        message = parsed;
      } catch (error) {
        this.rejectOrQueueError(error instanceof Error ? error : new Error("Malformed websocket server message"));
        return;
      }
      const waiter = this.waiters.shift();
      if (waiter) {
        clearTimeout(waiter.timeoutId);
        waiter.resolve(message);
      }
      else this.queue.push({ kind: "message", message });
    });
  }

  private rejectOrQueueError(error: Error): void {
    const waiter = this.waiters.shift();
    if (!waiter) {
      this.queue.push({ kind: "error", error });
      return;
    }
    clearTimeout(waiter.timeoutId);
    waiter.reject(error);
  }

  next(timeoutMs = 5_000): Promise<ServerMessage> {
    const queued = this.queue.shift();
    if (queued?.kind === "message") return Promise.resolve(queued.message);
    if (queued?.kind === "error") return Promise.reject(queued.error);
    return new Promise((resolve, reject) => {
      const waiter = {
        resolve,
        reject,
        timeoutId: setTimeout(() => {
          const index = this.waiters.indexOf(waiter);
          if (index >= 0) this.waiters.splice(index, 1);
          reject(new Error(`Timed out waiting for websocket message after ${timeoutMs}ms`));
        }, timeoutMs),
      };
      this.waiters.push(waiter);
    });
  }
}

async function createTestServer(): Promise<TestServer> {
  const manager = new RoomManager();
  const sockets = new Map<string, WebSocket>();
  let nextClientId = 1;
  const server = http.createServer();
  const wss = new WebSocketServer({ server, path: "/ws" });

  function flush(outgoing: ReturnType<RoomManager["handle"]>): void {
    outgoing.forEach(({ clientId, message }) => {
      const socket = sockets.get(clientId);
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
    });
  }

  function sendToClient(clientId: string, message: ServerMessage): void {
    const socket = sockets.get(clientId);
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }

  wss.on("connection", socket => {
    const clientId = String(nextClientId);
    nextClientId += 1;
    sockets.set(clientId, socket);
    socket.on("message", data => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        sendToClient(clientId, { type: "error", message: "Ungültige Nachricht." });
        return;
      }
      if (!isClientMessage(parsed)) {
        sendToClient(clientId, { type: "error", message: "Ungültiges Nachrichtenformat." });
        return;
      }
      flush(manager.handle(clientId, parsed));
    });
    socket.on("close", () => {
      sockets.delete(clientId);
      flush(manager.disconnect(clientId));
    });
  });

  await new Promise<void>(resolve => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("missing address");
  const testServer = {
    url: `ws://127.0.0.1:${address.port}/ws`,
    close: async () => {
      wss.clients.forEach(client => client.terminate());
      await new Promise<void>(resolve => wss.close(() => resolve()));
      await new Promise<void>(resolve => server.close(() => resolve()));
    },
  };
  servers.push(testServer);
  return testServer;
}

function connect(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
  });
}

async function send(socket: WebSocket, reader: SocketReader, message: ClientMessage): Promise<ServerMessage> {
  const next = reader.next();
  socket.send(JSON.stringify(message));
  return next;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => server.close()));
});

describe("websocket room flow", () => {
  it("times out when a websocket message never arrives", async () => {
    const server = await createTestServer();
    const socket = await connect(server.url);
    const reader = new SocketReader(socket);

    await expect(reader.next(20)).rejects.toThrow("Timed out waiting for websocket message");

    socket.close();
  });

  it("rejects malformed server messages in the reader", async () => {
    const socket = new EventEmitter() as unknown as WebSocket;
    const reader = new SocketReader(socket);
    const nextMessage = reader.next();

    (socket as unknown as EventEmitter).emit("message", Buffer.from("{"));

    await expect(nextMessage).rejects.toThrow();
  });

  it("rejects malformed queued server messages in the reader", async () => {
    const socket = new EventEmitter() as unknown as WebSocket;
    const reader = new SocketReader(socket);

    (socket as unknown as EventEmitter).emit("message", Buffer.from("{"));

    await expect(reader.next()).rejects.toThrow();
  });

  it("returns error envelopes for malformed websocket messages", async () => {
    const server = await createTestServer();
    const socket = await connect(server.url);
    const reader = new SocketReader(socket);

    socket.send("{");
    const parseError = await reader.next();
    expect(parseError).toEqual({ type: "error", message: "Ungültige Nachricht." });

    socket.send(JSON.stringify({ type: "unknown" }));
    const shapeError = await reader.next();
    expect(shapeError).toEqual({ type: "error", message: "Ungültiges Nachrichtenformat." });

    socket.close();
  });

  it("creates a room, lets a player join, and broadcasts lobby snapshots", async () => {
    const server = await createTestServer();
    const gm = await connect(server.url);
    const player = await connect(server.url);
    const gmReader = new SocketReader(gm);
    const playerReader = new SocketReader(player);

    const gmConnected = await send(gm, gmReader, { type: "gm:createRoom" });
    expect(gmConnected.type).toBe("connected");
    if (gmConnected.type !== "connected") throw new Error("expected connected");
    await gmReader.next();

    const playerConnectedPromise = playerReader.next();
    const gmSnapshotPromise = gmReader.next();
    player.send(JSON.stringify({
      type: "player:joinRoom",
      payload: { roomCode: gmConnected.session.roomCode, name: "Alex" },
    } satisfies ClientMessage));

    const playerConnected = await playerConnectedPromise;
    const playerSnapshotAfterJoin = await playerReader.next();
    const gmSnapshot = await gmSnapshotPromise;
    expect(playerConnected.type).toBe("connected");
    if (playerConnected.type !== "connected") throw new Error("expected player connected");
    expect(playerConnected.session.roomCode).toBe(gmConnected.session.roomCode);
    expect(playerConnected.session.role).toBe("player");

    expect(playerSnapshotAfterJoin.type).toBe("snapshot");
    if (playerSnapshotAfterJoin.type !== "snapshot") throw new Error("expected player snapshot");
    expect(playerSnapshotAfterJoin.snapshot.view).toBe("player");
    if (playerSnapshotAfterJoin.snapshot.view !== "player") throw new Error("expected player snapshot view");
    expect(playerSnapshotAfterJoin.snapshot.roomCode).toBe(gmConnected.session.roomCode);
    expect(playerSnapshotAfterJoin.snapshot.player?.name).toBe("Alex");
    expect(playerSnapshotAfterJoin.snapshot.players.map(playerSnapshot => playerSnapshot.name)).toContain("Alex");

    expect(gmSnapshot.type).toBe("snapshot");
    if (gmSnapshot.type !== "snapshot") throw new Error("expected gm snapshot");
    expect(gmSnapshot.snapshot.view).toBe("gm");
    if (gmSnapshot.snapshot.view !== "gm") throw new Error("expected gm snapshot view");
    expect(gmSnapshot.snapshot.roomCode).toBe(gmConnected.session.roomCode);
    expect(gmSnapshot.snapshot.players.map(playerSnapshot => playerSnapshot.name)).toContain("Alex");
    expect(gmSnapshot.snapshot.players.find(playerSnapshot => playerSnapshot.name === "Alex")?.connected).toBe(true);

    gm.close();
    player.close();
  });
});
