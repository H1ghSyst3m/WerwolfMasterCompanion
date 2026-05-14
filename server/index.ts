import http from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { RoomManager } from "./roomManager";
import { isClientMessage } from "../src/online/messages";
import type { ClientMessage, ServerMessage } from "../src/online/messages";

function parsePort(value: string | undefined, fallback = 8787): number {
  if (value == null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) return fallback;
  return parsed;
}

const port = parsePort(process.env.PORT ?? process.env.WERWOLF_PORT);
const manager = new RoomManager();
const sockets = new Map<string, WebSocket>();

let nextClientId = 1;

function send(clientId: string, message: ServerMessage): void {
  const socket = sockets.get(clientId);
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(message));
}

function flush(outgoing: ReturnType<RoomManager["handle"]>): void {
  outgoing.forEach(({ clientId, message }) => send(clientId, message));
}

function logRoomManagerError(context: string, error: unknown): void {
  console.error(context, error);
}

function handleClientMessage(clientId: string, message: ClientMessage): void {
  try {
    flush(manager.handle(clientId, message));
  } catch (error) {
    logRoomManagerError(`RoomManager.handle failed for client ${clientId}, message ${message.type}:`, error);
    send(clientId, { type: "error", message: "Internal server error." });
  }
}

function handleDisconnect(clientId: string): void {
  try {
    flush(manager.disconnect(clientId));
  } catch (error) {
    logRoomManagerError(`RoomManager.disconnect failed for client ${clientId}:`, error);
  }
}

function handleTimerTick(): void {
  try {
    flush(manager.tickTimers());
  } catch (error) {
    logRoomManagerError("RoomManager.tickTimers failed:", error);
  }
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, rooms: manager.getRoomCount() }));
    return;
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("error", error => {
  console.error("WebSocket server error:", error);
});

wss.on("connection", socket => {
  const clientId = String(nextClientId);
  nextClientId += 1;
  sockets.set(clientId, socket);
  let cleanedUp = false;

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    sockets.delete(clientId);
    handleDisconnect(clientId);
  };

  socket.on("message", data => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data.toString());
    } catch {
      send(clientId, { type: "error", message: "Ungültige Nachricht." });
      return;
    }
    if (!isClientMessage(parsed)) {
      send(clientId, { type: "error", message: "Ungültiges Nachrichtenformat." });
      return;
    }
    handleClientMessage(clientId, parsed as ClientMessage);
  });

  socket.on("error", error => {
    console.error(`WebSocket error for client ${clientId}:`, error);
    send(clientId, { type: "error", message: "Socket error." });
    cleanup();
  });

  socket.on("close", cleanup);
});

setInterval(() => {
  handleTimerTick();
}, 1000).unref();

server.listen(port, () => {
  console.log(`Werwolf websocket server listening on http://0.0.0.0:${port}`);
});
