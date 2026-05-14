import type {
  OnlineGmSnapshot,
  OnlineLobbyPlayer,
  OnlinePlayerSnapshot,
  OnlineRoomPlayer,
  OnlineSession,
} from "../src/online/messages";
import type { Player } from "../src/types";
import type { OutgoingMessage, ServerRoom, ServerRoomPlayer } from "./roomTypes";

function publicPlayer(player: ServerRoomPlayer): OnlineRoomPlayer {
  return {
    id: player.id,
    name: player.name,
    role: player.role,
    originalRole: player.originalRole,
    alive: player.alive,
    lover: player.lover,
    connected: player.connected,
    roleRevealed: player.roleRevealed,
  };
}

function lobbyPlayer(player: ServerRoomPlayer): OnlineLobbyPlayer {
  return {
    id: player.id,
    name: player.name,
    connected: player.connected,
    roleRevealed: player.roleRevealed,
  };
}

function stripConnectionFields(player: ServerRoomPlayer, visible: boolean): Player {
  return {
    id: player.id,
    name: player.name,
    role: visible ? player.role : null,
    originalRole: visible ? player.originalRole : null,
    alive: player.alive,
    lover: visible ? player.lover : null,
  };
}

function publicRuntimePlayer(player: Player): Player {
  return {
    id: player.id,
    name: player.name,
    role: player.role,
    originalRole: player.originalRole,
    alive: player.alive,
    lover: player.lover,
  };
}

function serializeRuntime(room: ServerRoom): Omit<OnlineGmSnapshot, "view" | "roomCode" | "roomPhase" | "locked" | "players"> {
  return {
    setupStep: room.setupStep,
    roleCounts: room.roleCounts,
    assignMode: room.assignMode,
    manualAssign: room.manualAssign,
    round: room.round,
    gamePhase: room.gamePhase,
    dayDeaths: room.dayDeaths.map(publicRuntimePlayer),
    dayVoteDone: room.dayVoteDone,
    dayVoteVictimId: room.dayVoteVictimId,
    triggerQueue: room.triggerQueue,
    log: room.log,
    winner: room.winner,
    winMode: room.winMode,
    revealMode: room.revealMode,
    roleReveal: room.roleReveal,
    timerDuration: room.timerDuration,
    dayTimer: room.dayTimer,
    timerRunning: room.timerRunning,
    nightStepIdx: room.nightStepIdx,
    nightVictim: room.nightVictim,
    nachtgastTarget: room.nachtgastTarget,
    beschuetzerTarget: room.beschuetzerTarget,
    beschuetzerLastTarget: room.beschuetzerLastTarget,
    verfluchterConvertedThisNight: room.verfluchterConvertedThisNight,
    urwolfTransform: room.urwolfTransform,
    urwolfUsed: room.urwolfUsed,
    seerTarget: room.seerTarget,
    seerRevealed: room.seerRevealed,
    auraSeerTarget: room.auraSeerTarget,
    auraSeerRevealed: room.auraSeerRevealed,
    detectivePicks: room.detectivePicks,
    detectiveRevealed: room.detectiveRevealed,
    witchHealUsed: room.witchHealUsed,
    witchPoisonUsed: room.witchPoisonUsed,
    witchHealThisRound: room.witchHealThisRound,
    witchPoisonTarget: room.witchPoisonTarget,
    amorPick: room.amorPick,
    nightResolved: room.nightResolved,
  };
}

export function gmSnapshot(room: ServerRoom): OnlineGmSnapshot {
  return {
    view: "gm",
    roomCode: room.code,
    roomPhase: room.roomPhase,
    locked: room.locked,
    players: room.players.map(publicPlayer),
    ...serializeRuntime(room),
  };
}

export function playerSnapshot(room: ServerRoom, player: ServerRoomPlayer): OnlinePlayerSnapshot {
  const roleVisible = room.roomPhase === "roleReveal" || room.roomPhase === "playing" || room.roomPhase === "ended";
  return {
    view: "player",
    roomCode: room.code,
    roomPhase: room.roomPhase,
    locked: room.locked,
    player: stripConnectionFields(player, roleVisible),
    roleRevealed: player.roleRevealed,
    players: room.players.map(lobbyPlayer),
    winner: room.winner,
  };
}

export function broadcast(room: ServerRoom): OutgoingMessage[] {
  const outgoing: OutgoingMessage[] = [];
  if (room.hostClientId) {
    outgoing.push({ clientId: room.hostClientId, message: { type: "snapshot", snapshot: gmSnapshot(room) } });
  }
  for (const player of room.players) {
    if (!player.clientId || !player.connected) continue;
    outgoing.push({ clientId: player.clientId, message: { type: "snapshot", snapshot: playerSnapshot(room, player) } });
  }
  return outgoing;
}

export function connected(clientId: string, session: OnlineSession): OutgoingMessage {
  return { clientId, message: { type: "connected", session } };
}

export function error(clientId: string, message: string): OutgoingMessage {
  return { clientId, message: { type: "error", message } };
}
