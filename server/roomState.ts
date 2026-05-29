import { createInitialGameRuntimeState, createPlayer, resetRuntimeForLobby } from "../src/domain/gameState";
import { getTeam } from "../src/logic/gameLogic";
import { makeToken } from "./roomIdentity";
import type { ServerRoom, ServerRoomPlayer } from "./roomTypes";
import type { GamePhase, Player } from "../src/types";

export function createServerRoom(code: string, hostToken: string, hostClientId: string): ServerRoom {
  const runtime = createInitialGameRuntimeState();
  return {
    ...runtime,
    code,
    roomPhase: "lobby",
    locked: false,
    hostToken,
    hostClientId,
    players: [],
    nextPlayerId: 1,
    lastTimerAt: Date.now(),
    roleReveal: false,
  };
}

export function createServerRoomPlayer(id: number, name: string, clientId: string, token = makeToken()): ServerRoomPlayer {
  return {
    ...createPlayer(id, name),
    token,
    clientId,
    connected: true,
    roleRevealed: false,
  };
}

export function mergePublicPlayers(room: ServerRoom, players: Player[]): ServerRoomPlayer[] {
  return players.map(player => {
    const previous = room.players.find(candidate => candidate.id === player.id);
    return {
      ...player,
      token: previous?.token ?? makeToken(),
      clientId: previous?.clientId ?? null,
      connected: previous?.connected ?? false,
      roleRevealed: previous?.roleRevealed ?? false,
    };
  });
}

export function resetRoomToLobby(room: ServerRoom): void {
  const existingPlayers = room.players;
  const reset = resetRuntimeForLobby(existingPlayers);
  Object.assign(room, reset);
  room.players = reset.players.map(player => {
    const previous = existingPlayers.find(candidate => candidate.id === player.id);
    return {
      ...player,
      token: previous?.token ?? makeToken(),
      clientId: previous?.clientId ?? null,
      connected: previous?.connected ?? false,
      roleRevealed: false,
    };
  });
  room.roomPhase = "lobby";
  room.locked = false;
  room.roleReveal = false;
  room.lastTimerAt = Date.now();
}

export function setPlayers(room: ServerRoom, players: Player[]): void {
  room.players = mergePublicPlayers(room, players);
  const maxPlayerId = room.players.reduce((maxId, player) => Math.max(maxId, player.id), 0);
  room.nextPlayerId = Math.max(room.nextPlayerId, maxPlayerId + 1, 1);
}

export function addLogText(room: ServerRoom, text: string, round?: number, gamePhase?: GamePhase): void {
  room.log = [
    ...room.log,
    { round: round ?? room.round, phase: gamePhase ?? room.gamePhase, text, time: Date.now() },
  ];
}

export function getEffectiveTeamForRoom(
  room: ServerRoom,
  playerId: number,
  urwolfTransformTargetId: number | null,
): "wolf" | "village" {
  const role = room.verfluchterConvertedThisNight === playerId ||
    urwolfTransformTargetId === playerId
    ? "werwolf"
    : room.players.find(player => player.id === playerId)?.role;
  return getTeam(role);
}
