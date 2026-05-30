import type {
  AssignMode,
  GamePhase,
  LogEntry,
  ManualAssign,
  Player,
  RevealMode,
  RoleCounts,
  RoleId,
  Trigger,
  WinMode,
  WinReason,
} from "../types";
import { DEFAULT_PREFS } from "../constants/gameOptions";
import { ROLE_IDS } from "../constants/roles";

export interface NightActionState {
  nightStepIdx: number;
  nightVictim: number | null;
  nachtgastTarget: number | null;
  beschuetzerTarget: number | null;
  beschuetzerLastTarget: number | null;
  wildesKindVorbild: number | null;
  verfluchterConvertedThisNight: number | null;
  harterBurscheWounded: number | null;
  harterBurscheWoundedThisNight: number | null;
  urwolfTransform: boolean | null;
  urwolfUsed: boolean;
  seerTarget: number | null;
  seerRevealed: boolean;
  auraSeerTarget: number | null;
  auraSeerRevealed: boolean;
  detectivePicks: number[];
  detectiveRevealed: boolean;
  witchHealUsed: boolean;
  witchPoisonUsed: boolean;
  witchHealThisRound: boolean;
  witchPoisonTarget: number | null;
  amorPick: number[];
  nightResolved: boolean;
}

export interface GameRuntimeState extends NightActionState {
  setupStep: number;
  players: Player[];
  roleCounts: RoleCounts;
  assignMode: AssignMode;
  manualAssign: ManualAssign;
  round: number;
  gamePhase: GamePhase;
  dayDeaths: Player[];
  dayVoteDone: boolean;
  dayVoteVictimId: number | null;
  triggerQueue: Trigger[];
  log: LogEntry[];
  winner: WinReason | null;
  winMode: WinMode;
  revealMode: RevealMode;
  roleReveal: boolean;
  timerDuration: number;
  dayTimer: number;
  timerRunning: boolean;
}

export const DEFAULT_ROLE_COUNTS: RoleCounts = {
  werwolf: 0,
  dorfbewohner: 0,
};

export function createInitialNightActions(): NightActionState {
  return {
    nightStepIdx: 0,
    nightVictim: null,
    nachtgastTarget: null,
    beschuetzerTarget: null,
    beschuetzerLastTarget: null,
    wildesKindVorbild: null,
    verfluchterConvertedThisNight: null,
    harterBurscheWounded: null,
    harterBurscheWoundedThisNight: null,
    urwolfTransform: null,
    urwolfUsed: false,
    seerTarget: null,
    seerRevealed: false,
    auraSeerTarget: null,
    auraSeerRevealed: false,
    detectivePicks: [],
    detectiveRevealed: false,
    witchHealUsed: false,
    witchPoisonUsed: false,
    witchHealThisRound: false,
    witchPoisonTarget: null,
    amorPick: [],
    nightResolved: false,
  };
}

export function resetNightActions(current: NightActionState): NightActionState {
  return {
    ...createInitialNightActions(),
    beschuetzerLastTarget: current.beschuetzerLastTarget,
    wildesKindVorbild: current.wildesKindVorbild,
    harterBurscheWounded: current.harterBurscheWounded,
    urwolfUsed: current.urwolfUsed,
    witchHealUsed: current.witchHealUsed,
    witchPoisonUsed: current.witchPoisonUsed,
    amorPick: current.amorPick,
  };
}

export function createInitialGameRuntimeState(players: Player[] = []): GameRuntimeState {
  return {
    setupStep: 1,
    players,
    roleCounts: { ...DEFAULT_ROLE_COUNTS },
    assignMode: null,
    manualAssign: {},
    round: 1,
    gamePhase: "night",
    dayDeaths: [],
    dayVoteDone: false,
    dayVoteVictimId: null,
    triggerQueue: [],
    log: [],
    winner: null,
    ...createInitialNightActions(),
    ...DEFAULT_PREFS,
    timerDuration: 300,
    dayTimer: 0,
    timerRunning: false,
  };
}

export function resetPlayersForLobby(players: Player[]): Player[] {
  return players.map(player => ({
    ...player,
    role: null,
    originalRole: null,
    alive: true,
    lover: null,
  }));
}

export function createPlayer(id: number, name: string): Player {
  return {
    id,
    name,
    role: null,
    originalRole: null,
    alive: true,
    lover: null,
  };
}

export function buildRolePool(roleCounts: RoleCounts): RoleId[] {
  const pool: RoleId[] = [];
  ROLE_IDS.forEach(roleId => {
    const count = sanitizeRoleCount(roleCounts, roleId);
    for (let i = 0; i < count; i += 1) pool.push(roleId);
  });
  return pool;
}

function sanitizeRoleCount(roleCounts: RoleCounts, roleId: RoleId): number {
  const rawCount = Number(roleCounts[roleId] ?? 0);
  return Number.isFinite(rawCount) ? Math.max(0, Math.floor(rawCount)) : 0;
}

export function nonVillagerRoleTotal(roleCounts: RoleCounts): number {
  return ROLE_IDS.reduce<number>((total, roleId) => {
    if (roleId === "dorfbewohner") return total;
    return total + sanitizeRoleCount(roleCounts, roleId);
  }, 0);
}

/**
 * Preserves sanitized non-villager counts and fills dorfbewohner as max(0,
 * playerCount - nonVillagerTotal). Overflow is allowed here; goToAssignment
 * enforces roleCountTotal(room.roleCounts) === room.players.length.
 */
export function autoFillVillagers(roleCounts: RoleCounts, playerCount: number): RoleCounts {
  const safePlayerCount = Number.isFinite(playerCount) ? Math.max(0, Math.floor(playerCount)) : 0;
  const normalized: RoleCounts = {};

  ROLE_IDS.forEach(roleId => {
    if (roleId === "dorfbewohner") return;
    const count = sanitizeRoleCount(roleCounts, roleId);
    if (count > 0) normalized[roleId] = count;
  });

  normalized.dorfbewohner = Math.max(0, safePlayerCount - nonVillagerRoleTotal(normalized));
  return normalized;
}

export function shuffleRoles(roleCounts: RoleCounts, random = Math.random): RoleId[] {
  const pool = buildRolePool(roleCounts);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

export function assignRolePool(players: Player[], rolePool: RoleId[]): Player[] {
  return players.map((player, index) => ({
    ...player,
    role: rolePool[index] ?? null,
    originalRole: rolePool[index] ?? null,
  }));
}

export function assignManualRoles(players: Player[], manualAssign: ManualAssign): Player[] {
  return players.map(player => {
    const hasAssignment = Object.prototype.hasOwnProperty.call(manualAssign, String(player.id));
    const finalRole = hasAssignment ? manualAssign[player.id] ?? null : null;
    return {
      ...player,
      role: finalRole,
      originalRole: finalRole,
    };
  });
}

export function roleCountTotal(roleCounts: RoleCounts): number {
  return ROLE_IDS.reduce<number>((total, roleId) => total + sanitizeRoleCount(roleCounts, roleId), 0);
}

export function resetRuntimeForLobby(players: Player[]): GameRuntimeState {
  return createInitialGameRuntimeState(resetPlayersForLobby(players));
}
