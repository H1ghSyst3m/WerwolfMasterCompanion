import { assignManualRoles, assignRolePool, autoFillVillagers, roleCountTotal, shuffleRoles } from "../src/domain/gameState";
import { REVEAL_MODE_SET, WIN_MODE_SET } from "../src/constants/gameOptions";
import { addLogText, mergePublicPlayers, resetRoomToLobby } from "./roomState";
import type { ServerRoom } from "./roomTypes";
import type { GamePhase, ManualAssign, Prefs, RoleCounts } from "../src/types";

export function lockLobby(room: ServerRoom): void {
  if (room.roomPhase !== "lobby" && room.roomPhase !== "assignment") throw new Error("Diese Aktion ist in der aktuellen Phase nicht erlaubt.");
  if (room.roomPhase === "lobby" && room.players.length < 5) throw new Error("Mindestens 5 Spieler werden benötigt.");
  room.locked = true;
  room.roomPhase = "setup";
  room.setupStep = 2;
  room.roleCounts = autoFillVillagers(room.roleCounts, room.players.length);
}

export function unlockLobby(room: ServerRoom): void {
  if (room.roomPhase !== "setup" && room.roomPhase !== "assignment") throw new Error("Diese Aktion ist in der aktuellen Phase nicht erlaubt.");
  resetRoomToLobby(room);
}

export function goToAssignment(room: ServerRoom): void {
  if (room.roomPhase !== "setup") throw new Error("Die Rollenzuweisung kann nur aus den Einstellungen gestartet werden.");
  room.roleCounts = autoFillVillagers(room.roleCounts, room.players.length);
  if (roleCountTotal(room.roleCounts) !== room.players.length) throw new Error("Die Rollenanzahl muss zur Spielerzahl passen.");
  room.roomPhase = "assignment";
  room.setupStep = 3;
  room.assignMode = null;
  room.manualAssign = {};
}

export function setAssignMode(room: ServerRoom, payload: unknown): void {
  room.assignMode = (payload as { assignMode?: typeof room.assignMode }).assignMode ?? null;
}

export function updateRoleCounts(room: ServerRoom, payload: unknown): void {
  room.roleCounts = autoFillVillagers(
    { ...((payload as { roleCounts?: RoleCounts }).roleCounts ?? {}) },
    room.players.length,
  );
}

export function setPrefs(room: ServerRoom, payload: unknown): void {
  const prefs = payload as Partial<Prefs>;
  if (prefs.winMode && WIN_MODE_SET.has(prefs.winMode)) room.winMode = prefs.winMode;
  if (prefs.revealMode && REVEAL_MODE_SET.has(prefs.revealMode)) room.revealMode = prefs.revealMode;
  if (typeof prefs.roleReveal === "boolean") room.roleReveal = prefs.roleReveal;
}

export function setManualAssign(room: ServerRoom, payload: unknown): void {
  room.manualAssign = { ...((payload as { manualAssign?: ManualAssign }).manualAssign ?? {}) };
}

export function addLog(room: ServerRoom, payload: unknown): void {
  const data = payload as { text?: unknown; round?: number; gamePhase?: GamePhase };
  addLogText(room, String(data.text ?? ""), data.round, data.gamePhase);
}

export function shuffleRoomRoles(room: ServerRoom): void {
  room.assignMode = "random";
  room.players = mergePublicPlayers(room, assignRolePool(room.players, shuffleRoles(room.roleCounts)));
}

export function assignRoomRoles(room: ServerRoom): void {
  room.players = mergePublicPlayers(room, assignManualRoles(room.players, room.manualAssign));
}
