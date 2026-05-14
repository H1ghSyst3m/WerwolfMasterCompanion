import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ONLINE_RECONNECT_EVENT,
  ONLINE_SESSION_KEY,
  toClientMessage,
} from "./messages";
import { getDefaultWsUrl } from "./wsUrl";
import type {
  ClientCommand,
  OnlineGmSnapshot,
  OnlinePlayerSnapshot,
  OnlineSession,
  OnlineSnapshot,
  ServerMessage,
} from "./messages";

type ConnectionStatus = "connecting" | "open" | "closed" | "error";

interface StoredSession extends OnlineSession {
  savedAt: number;
}

function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(ONLINE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (!parsed.roomCode || !parsed.clientToken || (parsed.role !== "gm" && parsed.role !== "player")) return null;
    return {
      roomCode: parsed.roomCode,
      clientToken: parsed.clientToken,
      role: parsed.role,
      savedAt: parsed.savedAt ?? Date.now(),
    };
  } catch {
    return null;
  }
}

function writeStoredSession(session: OnlineSession): void {
  try {
    localStorage.setItem(ONLINE_SESSION_KEY, JSON.stringify({ ...session, savedAt: Date.now() }));
  } catch {
    // ignore
  }
}

function clearStoredSession(): void {
  try {
    localStorage.removeItem(ONLINE_SESSION_KEY);
  } catch {
    // ignore
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isOnlineSession(value: unknown): value is OnlineSession {
  return (
    isRecord(value) &&
    typeof value.roomCode === "string" &&
    typeof value.clientToken === "string" &&
    (value.role === "gm" || value.role === "player")
  );
}

function isOnlineSnapshot(value: unknown): value is OnlineSnapshot {
  return isRecord(value) && (value.view === "gm" || value.view === "player");
}

function isServerMessage(value: unknown): value is ServerMessage {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  switch (value.type) {
    case "connected":
      return isOnlineSession(value.session);
    case "snapshot":
      return isOnlineSnapshot(value.snapshot);
    case "hostTransferred":
    case "kicked":
    case "leftRoom":
      return typeof value.roomCode === "string";
    case "error":
      return typeof value.message === "string";
    default:
      return false;
  }
}

export interface OnlineRoomHook {
  status: ConnectionStatus;
  error: string | null;
  session: OnlineSession | null;
  snapshot: OnlineSnapshot | null;
  gmSnapshot: OnlineGmSnapshot | null;
  playerSnapshot: OnlinePlayerSnapshot | null;
  storedSession: StoredSession | null;
  wasHostTransferred: boolean;
  transferredRoomCode: string | null;
  createRoom: () => void;
  joinRoom: (roomCode: string, name: string) => void;
  resumeStoredSession: () => void;
  clearSession: () => void;
  sendCommand: (command: ClientCommand) => void;
  reconnect: () => void;
}

export function useOnlineRoom(): OnlineRoomHook {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<OnlineSession | null>(null);
  const [snapshot, setSnapshot] = useState<OnlineSnapshot | null>(null);
  const [storedSession, setStoredSession] = useState<StoredSession | null>(() => readStoredSession());
  const [wasHostTransferred, setWasHostTransferred] = useState(false);
  const [transferredRoomCode, setTransferredRoomCode] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    socketRef.current?.close();
    setStatus("connecting");
    setError(null);
    const socket = new WebSocket(getDefaultWsUrl());
    socketRef.current = socket;
    const isActiveSocket = () => socketRef.current === socket;
    socket.addEventListener("open", () => {
      if (!isActiveSocket()) return;
      setStatus("open");
    });
    socket.addEventListener("close", () => {
      if (!isActiveSocket()) return;
      setSession(null);
      setSnapshot(null);
      setWasHostTransferred(false);
      setTransferredRoomCode(null);
      setStatus("closed");
    });
    socket.addEventListener("error", () => {
      if (!isActiveSocket()) return;
      setStatus("error");
      setError("Die Verbindung zum Online-Server konnte nicht hergestellt werden.");
    });
    socket.addEventListener("message", event => {
      if (!isActiveSocket()) return;
      let parsed: ServerMessage;
      try {
        const raw: unknown = JSON.parse(String(event.data));
        if (!isServerMessage(raw)) return;
        parsed = raw;
      } catch {
        return;
      }
      if (parsed.type === "connected") {
        setSession(parsed.session);
        setWasHostTransferred(false);
        setTransferredRoomCode(null);
        writeStoredSession(parsed.session);
        setStoredSession(readStoredSession());
        return;
      }
      if (parsed.type === "snapshot") {
        setSnapshot(parsed.snapshot);
        setError(null);
        return;
      }
      if (parsed.type === "hostTransferred") {
        setSession(null);
        setSnapshot(null);
        setWasHostTransferred(true);
        setTransferredRoomCode(parsed.roomCode);
        clearStoredSession();
        setStoredSession(null);
        window.dispatchEvent(new CustomEvent(ONLINE_RECONNECT_EVENT, { detail: { roomCode: parsed.roomCode } }));
        return;
      }
      if (parsed.type === "kicked" || parsed.type === "leftRoom") {
        setSession(null);
        setSnapshot(null);
        setWasHostTransferred(false);
        setTransferredRoomCode(null);
        clearStoredSession();
        setStoredSession(null);
        return;
      }
      if (parsed.type === "error") {
        setError(parsed.message);
      }
    });
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(connect, 0);
    return () => {
      window.clearTimeout(timerId);
      socketRef.current?.close();
    };
  }, [connect]);

  const sendCommand = useCallback((command: ClientCommand) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError("Noch nicht mit dem Online-Server verbunden.");
      return;
    }
    socket.send(JSON.stringify(toClientMessage(command, session ?? undefined)));
  }, [session]);

  const createRoom = useCallback(() => {
    setWasHostTransferred(false);
    setTransferredRoomCode(null);
    sendCommand({ type: "gm:createRoom" });
  }, [sendCommand]);

  const joinRoom = useCallback((roomCode: string, name: string) => {
    setWasHostTransferred(false);
    sendCommand({ type: "player:joinRoom", payload: { roomCode, name } });
  }, [sendCommand]);

  const resumeStoredSession = useCallback(() => {
    const stored = readStoredSession();
    if (!stored) return;
    sendCommand({
      type: "resume",
      payload: { roomCode: stored.roomCode, clientToken: stored.clientToken },
    });
  }, [sendCommand]);

  const clearSession = useCallback(() => {
    setSession(null);
    setSnapshot(null);
    setWasHostTransferred(false);
    setTransferredRoomCode(null);
    clearStoredSession();
    setStoredSession(null);
  }, []);

  const gmSnapshot = snapshot?.view === "gm" ? snapshot : null;
  const playerSnapshot = snapshot?.view === "player" ? snapshot : null;

  return useMemo(() => ({
    status,
    error,
    session,
    snapshot,
    gmSnapshot,
    playerSnapshot,
    storedSession,
    wasHostTransferred,
    transferredRoomCode,
    createRoom,
    joinRoom,
    resumeStoredSession,
    clearSession,
    sendCommand,
    reconnect: connect,
  }), [
    status,
    error,
    session,
    snapshot,
    gmSnapshot,
    playerSnapshot,
    storedSession,
    wasHostTransferred,
    transferredRoomCode,
    createRoom,
    joinRoom,
    resumeStoredSession,
    clearSession,
    sendCommand,
    connect,
  ]);
}
