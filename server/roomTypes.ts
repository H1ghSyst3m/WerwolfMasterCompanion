import type { GameRuntimeState } from "../src/domain/gameState";
import type { ServerMessage } from "../src/online/messages";
import type { Player, RoomPhase } from "../src/types";

export interface ServerRoomPlayer extends Player {
  token: string;
  clientId: string | null;
  connected: boolean;
  roleRevealed: boolean;
}

export interface ServerRoom extends Omit<GameRuntimeState, "players"> {
  code: string;
  roomPhase: RoomPhase;
  locked: boolean;
  hostToken: string;
  hostClientId: string | null;
  players: ServerRoomPlayer[];
  nextPlayerId: number;
  lastTimerAt: number;
}

export interface ClientSession {
  roomCode: string;
  clientToken: string;
  role: "gm" | "player";
  playerId?: number;
}

export interface OutgoingMessage {
  clientId: string;
  message: ServerMessage;
}
