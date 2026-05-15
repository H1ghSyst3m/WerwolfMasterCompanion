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

type ConnectionStatus = "connecting" | "reconnecting" | "open" | "closed" | "error";

const AUTO_RECONNECT_INITIAL_DELAY_MS = 1_000;
const AUTO_RECONNECT_MAX_DELAY_MS = 10_000;

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
  const sessionRef = useRef<OnlineSession | null>(null);
  const storedSessionRef = useRef<StoredSession | null>(storedSession);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  const pendingResumeRef = useRef(false);
  const connectRef = useRef<(isReconnect?: boolean) => void>(() => undefined);

  const setActiveSession = useCallback((nextSession: OnlineSession | null) => {
    sessionRef.current = nextSession;
    setSession(nextSession);
  }, []);

  const setActiveStoredSession = useCallback((nextSession: StoredSession | null) => {
    storedSessionRef.current = nextSession;
    setStoredSession(nextSession);
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current === null) return;
    window.clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (!shouldReconnectRef.current || reconnectTimerRef.current !== null) return;
    const delay = Math.min(
      AUTO_RECONNECT_MAX_DELAY_MS,
      AUTO_RECONNECT_INITIAL_DELAY_MS * 2 ** reconnectAttemptRef.current,
    );
    reconnectAttemptRef.current += 1;
    setStatus("reconnecting");
    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null;
      connectRef.current(true);
    }, delay);
  }, []);

  const sendResume = useCallback((socket: WebSocket, resumeSession: OnlineSession | StoredSession) => {
    pendingResumeRef.current = true;
    socket.send(JSON.stringify(toClientMessage({
      type: "resume",
      payload: {
        roomCode: resumeSession.roomCode,
        clientToken: resumeSession.clientToken,
      },
    })));
  }, []);

  const connect = useCallback((isReconnect = false) => {
    shouldReconnectRef.current = true;
    clearReconnectTimer();
    const previousSocket = socketRef.current;
    socketRef.current = null;
    previousSocket?.close();
    pendingResumeRef.current = false;
    setStatus(isReconnect ? "reconnecting" : "connecting");
    setError(null);
    const socket = new WebSocket(getDefaultWsUrl());
    socketRef.current = socket;
    const isActiveSocket = () => socketRef.current === socket;
    socket.addEventListener("open", () => {
      if (!isActiveSocket()) return;
      reconnectAttemptRef.current = 0;
      const resumeSession = sessionRef.current ?? storedSessionRef.current ?? readStoredSession();
      if (resumeSession) {
        setStatus("reconnecting");
        sendResume(socket, resumeSession);
        return;
      }
      setStatus("open");
    });
    socket.addEventListener("close", () => {
      if (!isActiveSocket()) return;
      socketRef.current = null;
      pendingResumeRef.current = false;
      const resumeSession = sessionRef.current ?? storedSessionRef.current ?? readStoredSession();
      if (shouldReconnectRef.current && resumeSession) {
        scheduleReconnect();
        return;
      }
      setActiveSession(null);
      setSnapshot(null);
      setWasHostTransferred(false);
      setTransferredRoomCode(null);
      setStatus("closed");
    });
    socket.addEventListener("error", () => {
      if (!isActiveSocket()) return;
      const resumeSession = sessionRef.current ?? storedSessionRef.current ?? readStoredSession();
      if (resumeSession) {
        setError("Die Verbindung wurde unterbrochen. Verbinde erneut...");
        scheduleReconnect();
        return;
      }
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
        pendingResumeRef.current = false;
        setStatus("open");
        setActiveSession(parsed.session);
        setWasHostTransferred(false);
        setTransferredRoomCode(null);
        writeStoredSession(parsed.session);
        setActiveStoredSession(readStoredSession());
        return;
      }
      if (parsed.type === "snapshot") {
        pendingResumeRef.current = false;
        setStatus("open");
        setSnapshot(parsed.snapshot);
        setError(null);
        return;
      }
      if (parsed.type === "hostTransferred") {
        pendingResumeRef.current = false;
        setActiveSession(null);
        setSnapshot(null);
        setWasHostTransferred(true);
        setTransferredRoomCode(parsed.roomCode);
        clearStoredSession();
        setActiveStoredSession(null);
        window.dispatchEvent(new CustomEvent(ONLINE_RECONNECT_EVENT, { detail: { roomCode: parsed.roomCode } }));
        return;
      }
      if (parsed.type === "kicked" || parsed.type === "leftRoom") {
        pendingResumeRef.current = false;
        setActiveSession(null);
        setSnapshot(null);
        setWasHostTransferred(false);
        setTransferredRoomCode(null);
        clearStoredSession();
        setActiveStoredSession(null);
        return;
      }
      if (parsed.type === "error") {
        if (pendingResumeRef.current) {
          pendingResumeRef.current = false;
          setStatus("open");
          setActiveSession(null);
          setSnapshot(null);
          setWasHostTransferred(false);
          setTransferredRoomCode(null);
          clearStoredSession();
          setActiveStoredSession(null);
        }
        setError(parsed.message);
      }
    });
  }, [clearReconnectTimer, scheduleReconnect, sendResume, setActiveSession, setActiveStoredSession]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const reconnect = useCallback(() => {
    reconnectAttemptRef.current = 0;
    connect(false);
  }, [connect]);

  useEffect(() => {
    const timerId = window.setTimeout(() => connect(false), 0);
    return () => {
      shouldReconnectRef.current = false;
      window.clearTimeout(timerId);
      clearReconnectTimer();
      const socket = socketRef.current;
      socketRef.current = null;
      socket?.close();
    };
  }, [clearReconnectTimer, connect]);

  const sendCommand = useCallback((command: ClientCommand) => {
    const socket = socketRef.current;
    if (pendingResumeRef.current) {
      setError("Die Verbindung wird wiederhergestellt.");
      return;
    }
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
    clearReconnectTimer();
    pendingResumeRef.current = false;
    setActiveSession(null);
    setSnapshot(null);
    setWasHostTransferred(false);
    setTransferredRoomCode(null);
    clearStoredSession();
    setActiveStoredSession(null);
  }, [clearReconnectTimer, setActiveSession, setActiveStoredSession]);

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
    reconnect,
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
    reconnect,
  ]);
}
