// Role identifiers
export type RoleId =
  | "werwolf"
  | "dorfbewohner"
  | "seher"
  | "hexe"
  | "jaeger"
  | "amor"
  | "narr"
  | "dorftrottel"
  | "auraseher"
  | "detektiv"
  | "urwolf"
  | "nachtgast"
  | "beschuetzer"
  | "wildeskind"
  | "verfluchter"
  | "harterbursche";

// Role definition
export interface RoleRule {
  title: string;
  text: string;
}

export interface Role {
  name: string;
  icon: string;
  team: "wolf" | "village";
  cat: "classic" | "special";
  desc: string;
  rules: RoleRule[];
  unique?: boolean;
}

// Player
export interface Player {
  id: number;
  name: string;
  role: RoleId | null;
  originalRole: RoleId | null;
  alive: boolean;
  lover: number | null;
}

// Log entry
export type GamePhase = "night" | "day";

export interface LogEntry {
  round: number;
  phase: GamePhase;
  text: string;
  time: number;
}

// Trigger / trigger queue
export type TriggerType = "hunter";

export interface Trigger {
  type: TriggerType;
  /** Numeric id of the player whose ability fires */
  victimId: number;
  /** Display name of the player whose ability fires */
  victim: string;
  /** What caused the trigger (e.g. "Werwölfe", "Abstimmung", "lover") */
  source: string;
}

// High-level phases
export type AppPhase = "setup" | "roleReveal" | "playing" | "ended";

/** Subset of AppPhase that can be written to a save file */
export type PersistedPhase = "roleReveal" | "playing" | "ended";

export type GameMode = "local" | "online";

export type RoomPhase = "lobby" | "setup" | "assignment" | "roleReveal" | "playing" | "ended";

// Win conditions
export type WinReason = "village" | "wolves" | "narr" | "dorftrottel" | "lovers";

/**
 * Win condition mode chosen at game setup.
 * - `"standard"`: wolves win immediately when `wolves >= village` (official rule)
 * - `"extended"`: wolf win is delayed if a Jäger is alive or the Hexe still has potions (house rule)
 */
export type WinMode = "standard" | "extended";

/**
 * What is revealed after a day vote elimination.
 * - `"hidden"`: nothing revealed, straight to night (house rule)
 * - `"team"`: shows 🐺 Böse or 🏘️ Gut (popular variant)
 * - `"role"`: shows the exact role icon + name (official rule, default)
 */
export type RevealMode = "hidden" | "team" | "role";

// Preferences

/**
 * User-facing settings that persist across games via `localStorage["werwolf-prefs"]`.
 * Add new preference fields here. `usePrefs` picks them up automatically.
 */
export interface Prefs {
  winMode: WinMode;
  revealMode: RevealMode;
  roleReveal: boolean;
}

// Night step
export type NightStepId =
  | "sleep"
  | "amor"
  | "lovers"
  | "wildeskind"
  | "nachtgast"
  | "beschuetzer"
  | "wolves"
  | "verfluchter"
  | "urwolf"
  | "urwolfinfo"
  | "seer"
  | "auraseer"
  | "detective"
  | "witch"
  | "harterbursche"
  | "dawn";

export interface NightStep {
  id: NightStepId;
  title: string;
  icon: string;
  desc: string;
  /** Whether the role associated with this step is still active */
  active: boolean;
}

// Setup helpers
export type AssignMode = "random" | "manual" | null;

/** Map from RoleId → count chosen for the current game */
export type RoleCounts = Partial<Record<RoleId, number>>;

/** Map from player id (as string key) → assigned RoleId */
export type ManualAssign = Record<string, RoleId | undefined>;

// Persisted save state
export interface SaveState {
  /** Schema version. Increment when the shape changes incompatibly. */
  schemaVersion: number;
  phase: PersistedPhase;
  setupStep: number;
  players: Player[];
  roleCounts: RoleCounts;
  assignMode: AssignMode;
  manualAssign: ManualAssign;
  round: number;
  gamePhase: GamePhase;
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
}
