import {
  advanceNightStep,
  applyNightActionPatch,
  dayVote,
  resolveHunter,
  resolveNight,
  startDay,
  startFirstNight,
  startGame,
  startNight,
} from "./roomGameFlow";
import { broadcast, error } from "./roomSnapshots";
import {
  closeRoom,
  createRoom,
  disconnectClient,
  joinRoom,
  kickPlayer,
  leaveRoom,
  requireRoom,
  resumeSession,
  transferHost,
} from "./roomSessions";
import {
  addLog,
  assignRoomRoles,
  goToAssignment,
  lockLobby,
  setAssignMode,
  setManualAssign,
  setPrefs,
  shuffleRoomRoles,
  unlockLobby,
  updateRoleCounts,
} from "./roomSetup";
import { resetRoomToLobby, setPlayers } from "./roomState";
import { setTimer, tickTimers } from "./roomTimers";
import type { ClientMessage } from "../src/online/messages";
import type { Player } from "../src/types";
import type { ClientSession, OutgoingMessage as RoomOutgoingMessage, ServerRoom } from "./roomTypes";
import type { RoomSessionContext } from "./roomSessions";

export type { OutgoingMessage } from "./roomTypes";
export { getEffectiveTeamForRoom } from "./roomState";

export class RoomManager {
  private readonly rooms = new Map<string, ServerRoom>();
  private readonly clientSessions = new Map<string, ClientSession>();

  getRoomCount(): number {
    return this.rooms.size;
  }

  getRoomForTest(roomCode: string): ServerRoom | null {
    return this.rooms.get(roomCode) ?? null;
  }

  handle(clientId: string, message: ClientMessage): RoomOutgoingMessage[] {
    try {
      switch (message.type) {
        case "gm:createRoom":
          return createRoom(this.sessionContext(), clientId);
        case "player:joinRoom":
          return joinRoom(this.sessionContext(), clientId, message.payload);
        case "resume":
          return resumeSession(this.sessionContext(), clientId, message.payload);
        default:
          return this.handleAuthenticated(clientId, message);
      }
    } catch (caught) {
      return [error(clientId, caught instanceof Error ? caught.message : "Unbekannter Fehler")];
    }
  }

  disconnect(clientId: string): RoomOutgoingMessage[] {
    return disconnectClient(this.sessionContext(), clientId);
  }

  tickTimers(now = Date.now()): RoomOutgoingMessage[] {
    return tickTimers(this.rooms.values(), now);
  }

  private sessionContext(): RoomSessionContext {
    return { rooms: this.rooms, clientSessions: this.clientSessions };
  }

  private handleAuthenticated(clientId: string, message: ClientMessage): RoomOutgoingMessage[] {
    const session = this.clientSessions.get(clientId);
    if (!session) throw new Error("Nicht verbunden.");
    const room = requireRoom(this.sessionContext(), session.roomCode);
    if (session.role === "player") return this.handlePlayer(clientId, room, session, message);
    return this.handleGm(clientId, room, message);
  }

  private handlePlayer(clientId: string, room: ServerRoom, session: ClientSession, message: ClientMessage): RoomOutgoingMessage[] {
    const player = room.players.find(candidate => candidate.id === session.playerId);
    if (!player) throw new Error("Spieler nicht gefunden.");
    if (!player.clientId || player.clientId !== clientId) {
      throw new Error("Diese Verbindung ist nicht mehr die aktive Spielerverbindung.");
    }
    if (message.type === "player:roleRevealDone") {
      player.roleRevealed = true;
      return broadcast(room);
    }
    if (message.type === "player:leaveRoom") {
      return leaveRoom(this.sessionContext(), room, session, player);
    }
    throw new Error("Diese Aktion ist Spielern nicht erlaubt.");
  }

  private handleGm(clientId: string, room: ServerRoom, message: ClientMessage): RoomOutgoingMessage[] {
    if (room.hostClientId !== clientId) throw new Error("Nur die Spielleitung darf diese Aktion ausführen.");
    switch (message.type) {
      case "gm:closeRoom":
        return closeRoom(this.sessionContext(), room);
      case "gm:lockLobby":
        lockLobby(room);
        return broadcast(room);
      case "gm:unlockLobby":
        unlockLobby(room);
        return broadcast(room);
      case "gm:goToAssignment":
        goToAssignment(room);
        return broadcast(room);
      case "gm:setAssignMode":
        setAssignMode(room, message.payload);
        return broadcast(room);
      case "gm:updateRoleCounts":
        updateRoleCounts(room, message.payload);
        return broadcast(room);
      case "gm:setPrefs":
        setPrefs(room, message.payload);
        return broadcast(room);
      case "gm:setManualAssign":
        setManualAssign(room, message.payload);
        return broadcast(room);
      case "gm:setPlayers":
        setPlayers(room, (message.payload as { players?: Player[] }).players ?? []);
        return broadcast(room);
      case "gm:addLog":
        addLog(room, message.payload);
        return broadcast(room);
      case "gm:shuffleRoles":
        shuffleRoomRoles(room);
        return broadcast(room);
      case "gm:assignRoles":
        assignRoomRoles(room);
        return broadcast(room);
      case "gm:startGame":
        startGame(room);
        return broadcast(room);
      case "gm:startFirstNight":
        startFirstNight(room);
        return broadcast(room);
      case "gm:updateNightAction":
        applyNightActionPatch(room, message.payload);
        return broadcast(room);
      case "gm:advanceNightStep":
        applyNightActionPatch(room, message.payload);
        advanceNightStep(room);
        return broadcast(room);
      case "gm:resolveNight":
        resolveNight(room);
        return broadcast(room);
      case "gm:resolveHunter":
        resolveHunter(room, (message.payload as { targetId?: number | null }).targetId ?? null);
        return broadcast(room);
      case "gm:startDay":
        startDay(room);
        return broadcast(room);
      case "gm:dayVote":
        dayVote(room, (message.payload as { playerId?: number }).playerId);
        return broadcast(room);
      case "gm:startNight":
        startNight(room);
        return broadcast(room);
      case "gm:setVoteConfirm":
        return broadcast(room);
      case "gm:setTimer":
        setTimer(room, message.payload);
        return broadcast(room);
      case "gm:resetToLobby":
        resetRoomToLobby(room);
        return broadcast(room);
      case "gm:transferHost":
        return transferHost(this.sessionContext(), clientId, room, (message.payload as { playerId?: number }).playerId);
      case "gm:kickPlayer":
        return kickPlayer(this.sessionContext(), room, (message.payload as { playerId?: number }).playerId);
      default:
        throw new Error("Unbekannter GM-Befehl.");
    }
  }
}
