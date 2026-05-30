import type { Player, RoleId, Trigger, WinReason, WinMode } from "../types";
import { ROLES } from "../constants/roles";

export type Team = "wolf" | "village";

export function getTeam(role: RoleId | null | undefined): Team {
  if (!role || !Object.prototype.hasOwnProperty.call(ROLES, role)) return "village";
  return ROLES[role].team;
}

export interface CheckWinOpts {
  witchHealUsed?: boolean;
  witchPoisonUsed?: boolean;
  winMode?: WinMode;
  getTeamForPlayer?: (player: Player) => Team;
}

export function checkWin(ps: Player[], opts?: CheckWinOpts): WinReason | null {
  const a = ps.filter(p => p.alive);
  const teamForPlayer = opts?.getTeamForPlayer ?? ((player: Player) => getTeam(player.role));
  const wolves = a.filter(p => teamForPlayer(p) === "wolf");
  const others = a.filter(p => teamForPlayer(p) !== "wolf");
  const lp = a.filter(p => p.lover !== null);
  if (lp.length === 2 && a.length === 2 && lp[0].lover === lp[1].id && lp[1].lover === lp[0].id) return "lovers";
  if (wolves.length === 0) return "village";
  if (wolves.length >= others.length) {
    if (opts?.winMode === "extended") {
      const jaegerAlive = others.some(p => p.role === "jaeger");
      const hexeAlive = others.some(p => p.role === "hexe");
      const witchHasPotions = hexeAlive && (opts.witchHealUsed === false || opts.witchPoisonUsed === false);
      if (jaegerAlive || witchHasPotions) return null;
    }
    return "wolves";
  }
  return null;
}

export interface KillResult {
  players: Player[];
  triggers: Trigger[];
  logs: string[];
}

export function getAliveNachtgast(ps: Player[]): Player | null {
  return ps.find(p => p.alive && p.role === "nachtgast") ?? null;
}

export function isNachtgastAwayFromWolfAttack(
  ps: Player[],
  nightVictim: number | null,
  nachtgastTarget: number | null,
): boolean {
  const nachtgast = getAliveNachtgast(ps);
  return Boolean(nachtgast && nachtgastTarget !== null && nightVictim === nachtgast.id);
}

export function getNachtgastCollateralVictim(
  ps: Player[],
  nightVictim: number | null,
  nachtgastTarget: number | null,
): Player | null {
  const nachtgast = getAliveNachtgast(ps);
  if (!nachtgast || nachtgastTarget === null || nightVictim !== nachtgastTarget) return null;
  if (nightVictim === nachtgast.id) return null;
  return nachtgast;
}

export function getWolfAttackConvertedVerfluchter(ps: Player[], nightVictim: number | null): Player | null {
  if (nightVictim === null) return null;
  return ps.find(p => p.id === nightVictim && p.alive && p.role === "verfluchter") ?? null;
}

export function isInvalidWolfAttack(
  nightVictim: number | null,
  beschuetzerTarget: number | null,
  verfluchterConvertedThisNight: number | null,
): boolean {
  return nightVictim !== null && (
    nightVictim === verfluchterConvertedThisNight ||
    (nightVictim === beschuetzerTarget && nightVictim !== verfluchterConvertedThisNight)
  );
}

export interface UrwolfTransformTargetOpts {
  nightVictim: number | null;
  nachtgastTarget: number | null;
  beschuetzerTarget: number | null;
  verfluchterConvertedThisNight: number | null;
  urwolfTransform: boolean | null;
}

export function getUrwolfTransformTarget(
  ps: Player[],
  {
    nightVictim,
    nachtgastTarget,
    beschuetzerTarget,
    verfluchterConvertedThisNight,
    urwolfTransform,
  }: UrwolfTransformTargetOpts,
): Player | null {
  if (!urwolfTransform || nightVictim === null) return null;
  const victim = ps.find(p => p.id === nightVictim && p.alive);
  if (!victim) return null;
  if (isNachtgastAwayFromWolfAttack(ps, nightVictim, nachtgastTarget)) return null;
  if (isInvalidWolfAttack(nightVictim, beschuetzerTarget, verfluchterConvertedThisNight)) return null;
  return victim;
}

export interface HarterBurscheWolfAttackOpts {
  nachtgastTarget: number | null;
  beschuetzerTarget: number | null;
  verfluchterConvertedThisNight: number | null;
  urwolfTransform: boolean | null;
  witchHealThisRound: boolean;
  harterBurscheWounded: number | null;
}

export function getHarterBurscheWoundedByWolfAttack(
  ps: Player[],
  nightVictim: number | null,
  {
    nachtgastTarget,
    beschuetzerTarget,
    verfluchterConvertedThisNight,
    urwolfTransform,
    witchHealThisRound,
    harterBurscheWounded,
  }: HarterBurscheWolfAttackOpts,
): Player | null {
  if (nightVictim === null || harterBurscheWounded === nightVictim) return null;
  const victim = ps.find(p => p.id === nightVictim && p.alive && p.role === "harterbursche");
  if (!victim) return null;
  if (isNachtgastAwayFromWolfAttack(ps, nightVictim, nachtgastTarget)) return null;
  if (isInvalidWolfAttack(nightVictim, beschuetzerTarget, verfluchterConvertedThisNight)) return null;
  if (urwolfTransform || witchHealThisRound) return null;
  return victim;
}

export function clearHarterBurscheWoundForDeadPlayer(ps: Player[], woundedPlayerId: number | null): number | null {
  if (woundedPlayerId === null) return null;
  return ps.some(p => p.id === woundedPlayerId && p.alive) ? woundedPlayerId : null;
}

export function convertPlayerToWerewolf(ps: Player[], playerId: number): Player[] {
  return ps.map(p => p.id === playerId ? { ...p, role: "werwolf" as RoleId } : p);
}

export interface WildesKindConversionResult {
  players: Player[];
  converted: Player | null;
}

export function convertWildesKindIfVorbildNewlyDead(
  previousPlayers: Player[],
  resolvedPlayers: Player[],
  wildesKindVorbild: number | null,
): WildesKindConversionResult {
  if (wildesKindVorbild === null) return { players: resolvedPlayers, converted: null };
  const wasVorbildAlive = previousPlayers.some(player => player.id === wildesKindVorbild && player.alive);
  const isVorbildDead = resolvedPlayers.some(player => player.id === wildesKindVorbild && !player.alive);
  if (!wasVorbildAlive || !isVorbildDead) return { players: resolvedPlayers, converted: null };

  const wildesKind = resolvedPlayers.find(player =>
    player.alive &&
    player.originalRole === "wildeskind" &&
    player.role !== "werwolf"
  ) ?? null;
  if (!wildesKind) return { players: resolvedPlayers, converted: null };

  return {
    players: convertPlayerToWerewolf(resolvedPlayers, wildesKind.id),
    converted: wildesKind,
  };
}

export function killPlayer(pid: number, cause: string, ps: Player[]): KillResult {
  let updated = ps.map(p => p.id === pid ? { ...p, alive: false } : p);
  const victim = updated.find(p => p.id === pid);
  if (!victim) return { players: updated, triggers: [], logs: [] };
  const triggers: Trigger[] = [];
  const logs: string[] = [];
  if (victim.lover !== null) {
    const partner = updated.find(p => p.id === victim.lover && p.alive);
    if (partner) {
      updated = updated.map(p => p.id === partner.id ? { ...p, alive: false } : p);
      logs.push(`💔 ${victim.name} war verliebt! ${partner.name} stirbt an gebrochenem Herzen.`);
      if (partner.role === "jaeger") {
        triggers.push({ type: "hunter", victimId: partner.id, victim: partner.name, source: "lover" });
      }
    }
  }
  if (victim.role === "jaeger") {
    triggers.push({ type: "hunter", victimId: victim.id, victim: victim.name, source: cause });
  }
  return { players: updated, triggers, logs };
}
