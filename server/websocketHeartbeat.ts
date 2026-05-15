import { WebSocket, WebSocketServer } from "ws";

export const WEBSOCKET_HEARTBEAT_INTERVAL_MS = 25_000;

export function startWebSocketHeartbeat(
  wss: WebSocketServer,
  intervalMs = WEBSOCKET_HEARTBEAT_INTERVAL_MS,
): () => void {
  const alive = new WeakMap<WebSocket, boolean>();

  wss.on("connection", socket => {
    alive.set(socket, true);
    socket.on("pong", () => alive.set(socket, true));
  });

  const interval = setInterval(() => {
    wss.clients.forEach(socket => {
      if (socket.readyState !== WebSocket.OPEN) return;
      if (alive.get(socket) === false) {
        socket.terminate();
        return;
      }
      alive.set(socket, false);
      socket.ping(undefined, false, error => {
        if (error) socket.terminate();
      });
    });
  }, intervalMs);

  interval.unref();

  const stop = () => clearInterval(interval);
  wss.once("close", stop);
  return stop;
}
