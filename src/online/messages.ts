import type {
  AssignMode,
  GamePhase,
  ManualAssign,
  Player,
  Prefs,
  RevealMode,
  RoleCounts,
  RoleId,
  RoomPhase,
  WinMode,
  WinReason,
} from "../types";
import type { GameRuntimeState } from "../domain/gameState";
import { ROLE_ID_SET } from "../constants/roles";
import { REVEAL_MODE_SET, WIN_MODE_SET } from "../constants/gameOptions";

export type OnlineRole = "gm" | "player";

export interface OnlineLobbyPlayer {
  id: number;
  name: string;
  connected: boolean;
  roleRevealed: boolean;
}

export interface OnlineRoomPlayer extends Player {
  connected: boolean;
  roleRevealed: boolean;
}

export interface OnlineSession {
  roomCode: string;
  clientToken: string;
  role: OnlineRole;
}

export interface OnlineGmSnapshot extends GameRuntimeState {
  view: "gm";
  roomCode: string;
  roomPhase: RoomPhase;
  locked: boolean;
  players: OnlineRoomPlayer[];
}

export interface OnlinePlayerSnapshot {
  view: "player";
  roomCode: string;
  roomPhase: RoomPhase;
  locked: boolean;
  player: Player | null;
  roleRevealed: boolean;
  players: OnlineLobbyPlayer[];
  winner: WinReason | null;
}

export type OnlineSnapshot = OnlineGmSnapshot | OnlinePlayerSnapshot;

export type GmCommand =
  | { type: "gm:createRoom"; payload?: undefined }
  | { type: "gm:closeRoom"; payload?: undefined }
  | { type: "gm:lockLobby"; payload?: undefined }
  | { type: "gm:unlockLobby"; payload?: undefined }
  | { type: "gm:goToAssignment"; payload?: undefined }
  | { type: "gm:setAssignMode"; payload: { assignMode: AssignMode } }
  | { type: "gm:updateRoleCounts"; payload: { roleCounts: RoleCounts } }
  | { type: "gm:setPrefs"; payload: Partial<Prefs> }
  | { type: "gm:setManualAssign"; payload: { manualAssign: ManualAssign } }
  | { type: "gm:setPlayers"; payload: { players: Player[] } }
  | { type: "gm:addLog"; payload: { text: string; round?: number; gamePhase?: GamePhase } }
  | { type: "gm:shuffleRoles"; payload?: undefined }
  | { type: "gm:assignRoles"; payload?: undefined }
  | { type: "gm:startGame"; payload?: undefined }
  | { type: "gm:startFirstNight"; payload?: undefined }
  | { type: "gm:updateNightAction"; payload: Partial<Pick<GameRuntimeState,
      | "nightStepIdx"
      | "nightVictim"
      | "nachtgastTarget"
      | "beschuetzerTarget"
      | "urwolfTransform"
      | "urwolfUsed"
      | "seerTarget"
      | "seerRevealed"
      | "auraSeerTarget"
      | "auraSeerRevealed"
      | "detectivePicks"
      | "detectiveRevealed"
      | "witchHealUsed"
      | "witchPoisonUsed"
      | "witchHealThisRound"
      | "witchPoisonTarget"
      | "amorPick"
      | "nightResolved"
    >> }
  | { type: "gm:advanceNightStep"; payload?: { urwolfTransform?: boolean | null } }
  | { type: "gm:resolveNight"; payload?: undefined }
  | { type: "gm:resolveHunter"; payload: { targetId: number | null } }
  | { type: "gm:startDay"; payload?: undefined }
  | { type: "gm:dayVote"; payload: { playerId: number } }
  | { type: "gm:startNight"; payload?: undefined }
  | { type: "gm:setVoteConfirm"; payload: { playerId: number | null } }
  | { type: "gm:setTimer"; payload: { dayTimer?: number; timerDuration?: number; timerRunning?: boolean } }
  | { type: "gm:resetToLobby"; payload?: undefined }
  | { type: "gm:transferHost"; payload: { playerId: number } }
  | { type: "gm:kickPlayer"; payload: { playerId: number } };

export type PlayerCommand =
  | { type: "player:joinRoom"; payload: { roomCode: string; name: string } }
  | { type: "player:roleRevealDone"; payload?: undefined }
  | { type: "player:leaveRoom"; payload?: undefined };

export type ResumeCommand = {
  type: "resume";
  payload: { roomCode: string; clientToken: string };
};

export type ClientCommand = GmCommand | PlayerCommand | ResumeCommand;

export interface ClientMessage {
  type: ClientCommand["type"];
  requestId?: string;
  roomCode?: string;
  clientToken?: string;
  payload?: unknown;
}

export type ServerMessage =
  | { type: "connected"; session: OnlineSession }
  | { type: "snapshot"; snapshot: OnlineSnapshot }
  | { type: "roomClosed"; roomCode: string }
  | { type: "hostTransferred"; roomCode: string }
  | { type: "kicked"; roomCode: string }
  | { type: "leftRoom"; roomCode: string }
  | { type: "error"; requestId?: string; message: string };

export const ONLINE_SESSION_KEY = "werwolf-online-session";

export const ONLINE_RECONNECT_EVENT = "werwolf-online-reconnect";

export function isWinMode(value: unknown): value is WinMode {
  return typeof value === "string" && WIN_MODE_SET.has(value as WinMode);
}

export function isRevealMode(value: unknown): value is RevealMode {
  return typeof value === "string" && REVEAL_MODE_SET.has(value as RevealMode);
}

export function isRoleId(value: unknown): value is RoleId {
  return typeof value === "string" && ROLE_ID_SET.has(value as RoleId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return isInteger(value) && value > 0;
}

function hasNoPayload(payload: unknown): boolean {
  return payload === undefined;
}

function isAssignMode(value: unknown): value is AssignMode {
  return value === null || value === "random" || value === "manual";
}

function isGamePhase(value: unknown): value is GamePhase {
  return value === "night" || value === "day";
}

function isRoleCounts(value: unknown): value is RoleCounts {
  if (!isRecord(value)) return false;
  return Object.entries(value).every(([roleId, count]) => isRoleId(roleId) && isNonNegativeInteger(count));
}

function isManualAssign(value: unknown): value is ManualAssign {
  if (!isRecord(value)) return false;
  return Object.entries(value).every(([playerId, roleId]) => isNonNegativeInteger(Number(playerId)) && (roleId === undefined || isRoleId(roleId)));
}

function isPlayer(value: unknown): value is Player {
  if (!isRecord(value)) return false;
  return (
    isNonNegativeInteger(value.id) &&
    typeof value.name === "string" &&
    (value.role === null || isRoleId(value.role)) &&
    (value.originalRole === null || isRoleId(value.originalRole)) &&
    typeof value.alive === "boolean" &&
    (value.lover === null || isNonNegativeInteger(value.lover))
  );
}

function isPlayers(value: unknown): value is Player[] {
  if (!Array.isArray(value)) return false;
  const ids = new Set<number>();
  for (const player of value) {
    if (!isPlayer(player)) return false;
    if (ids.has(player.id)) return false;
    ids.add(player.id);
  }
  return true;
}

function isOptionalNonNegativeIntegerArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(isNonNegativeInteger);
}

function isPrefsPayload(value: unknown): value is Partial<Prefs> {
  if (!isRecord(value)) return false;
  if ("winMode" in value && !isWinMode(value.winMode)) return false;
  if ("revealMode" in value && !isRevealMode(value.revealMode)) return false;
  if ("roleReveal" in value && typeof value.roleReveal !== "boolean") return false;
  return true;
}

function isNightActionPayload(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return Object.entries(value).every(([key, fieldValue]) => {
    switch (key) {
      case "nightStepIdx":
        return isNonNegativeInteger(fieldValue);
      case "nightVictim":
      case "nachtgastTarget":
      case "beschuetzerTarget":
      case "seerTarget":
      case "auraSeerTarget":
      case "witchPoisonTarget":
        return fieldValue === null || isNonNegativeInteger(fieldValue);
      case "urwolfTransform":
        return fieldValue === null || typeof fieldValue === "boolean";
      case "urwolfUsed":
      case "seerRevealed":
      case "auraSeerRevealed":
      case "detectiveRevealed":
      case "witchHealUsed":
      case "witchPoisonUsed":
      case "witchHealThisRound":
      case "nightResolved":
        return typeof fieldValue === "boolean";
      case "detectivePicks":
      case "amorPick":
        return isOptionalNonNegativeIntegerArray(fieldValue);
      default:
        return false;
    }
  });
}

function isAdvanceNightStepPayload(value: unknown): boolean {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  return Object.entries(value).every(([key, fieldValue]) =>
    key === "urwolfTransform" && (fieldValue === null || typeof fieldValue === "boolean")
  );
}

export function isClientMessage(value: unknown): value is ClientMessage {
  if (!value || typeof value !== "object") return false;
  const maybe = value as { type?: unknown; requestId?: unknown; roomCode?: unknown; clientToken?: unknown; payload?: unknown };
  if (typeof maybe.type !== "string") return false;
  if ("requestId" in maybe && maybe.requestId !== undefined && typeof maybe.requestId !== "string") return false;
  if ("roomCode" in maybe && maybe.roomCode !== undefined && typeof maybe.roomCode !== "string") return false;
  if ("clientToken" in maybe && maybe.clientToken !== undefined && typeof maybe.clientToken !== "string") return false;
  switch (maybe.type) {
    case "gm:createRoom":
    case "gm:closeRoom":
    case "gm:lockLobby":
    case "gm:unlockLobby":
    case "gm:goToAssignment":
    case "gm:shuffleRoles":
    case "gm:assignRoles":
    case "gm:startGame":
    case "gm:startFirstNight":
    case "gm:resolveNight":
    case "gm:startDay":
    case "gm:startNight":
    case "gm:resetToLobby":
    case "player:roleRevealDone":
    case "player:leaveRoom":
      return hasNoPayload(maybe.payload);
    case "gm:setAssignMode":
      return isRecord(maybe.payload) && isAssignMode(maybe.payload.assignMode);
    case "gm:updateRoleCounts":
      return isRecord(maybe.payload) && isRoleCounts(maybe.payload.roleCounts);
    case "gm:setPrefs":
      return isPrefsPayload(maybe.payload);
    case "gm:setManualAssign":
      return isRecord(maybe.payload) && isManualAssign(maybe.payload.manualAssign);
    case "gm:setPlayers":
      return isRecord(maybe.payload) && isPlayers(maybe.payload.players);
    case "gm:addLog":
      return (
        isRecord(maybe.payload) &&
        typeof maybe.payload.text === "string" &&
        (!("round" in maybe.payload) || isPositiveInteger(maybe.payload.round)) &&
        (!("gamePhase" in maybe.payload) || isGamePhase(maybe.payload.gamePhase))
      );
    case "gm:updateNightAction":
      return isNightActionPayload(maybe.payload);
    case "gm:advanceNightStep":
      return isAdvanceNightStepPayload(maybe.payload);
    case "gm:resolveHunter":
      return isRecord(maybe.payload) && (maybe.payload.targetId === null || isNonNegativeInteger(maybe.payload.targetId));
    case "gm:dayVote":
    case "gm:transferHost":
    case "gm:kickPlayer":
      return isRecord(maybe.payload) && isNonNegativeInteger(maybe.payload.playerId);
    case "gm:setVoteConfirm":
      return isRecord(maybe.payload) && (maybe.payload.playerId === null || isNonNegativeInteger(maybe.payload.playerId));
    case "gm:setTimer":
      return (
        isRecord(maybe.payload) &&
        (!("dayTimer" in maybe.payload) || (typeof maybe.payload.dayTimer === "number" && Number.isFinite(maybe.payload.dayTimer) && maybe.payload.dayTimer >= 0)) &&
        (!("timerDuration" in maybe.payload) || (typeof maybe.payload.timerDuration === "number" && Number.isFinite(maybe.payload.timerDuration) && maybe.payload.timerDuration >= 0)) &&
        (!("timerRunning" in maybe.payload) || typeof maybe.payload.timerRunning === "boolean")
      );
    case "player:joinRoom":
      return isRecord(maybe.payload) && typeof maybe.payload.roomCode === "string" && typeof maybe.payload.name === "string";
    case "resume":
      return isRecord(maybe.payload) && typeof maybe.payload.roomCode === "string" && typeof maybe.payload.clientToken === "string";
    default:
      return false;
  }
}

export function toClientMessage(command: ClientCommand, session?: OnlineSession): ClientMessage {
  return {
    type: command.type,
    roomCode: session?.roomCode,
    clientToken: session?.clientToken,
    payload: "payload" in command ? command.payload : undefined,
  };
}
