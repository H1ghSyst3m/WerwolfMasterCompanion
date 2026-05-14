import { useState, useCallback, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { RevealMode, SaveState, WinMode, WinReason } from "../types";
import { REVEAL_MODE_SET, WIN_MODE_SET, WIN_REASON_SET } from "../constants/gameOptions";
import { normalizePersistedPhase } from "../domain/persistedPhase";

function isSaveState(v: unknown): v is SaveState {
  if (!v || typeof v !== "object") return false;
  const s = v as Partial<SaveState>;

  // Require an explicit supported schema version.
  if (s.schemaVersion !== 1 && s.schemaVersion !== 2) return false;

  // Top-level phase
  const normalizedPhase = normalizePersistedPhase(s.phase);
  if (!normalizedPhase) return false;
  s.phase = normalizedPhase;

  // Setup fields
  if (typeof s.setupStep !== "number" || !Number.isFinite(s.setupStep) || !Number.isInteger(s.setupStep) || s.setupStep < 0) return false;

  // Players array: each entry must have the required Player properties.
  if (!Array.isArray(s.players)) return false;
  for (const p of s.players) {
    if (!p || typeof p !== "object") return false;
    const pid = (p as { id?: unknown }).id;
    if (typeof pid !== "number" || !Number.isFinite(pid) || !Number.isInteger(pid) || pid < 0) return false;
    if (typeof (p as { name?: unknown }).name !== "string") return false;
    if (typeof (p as { alive?: unknown }).alive !== "boolean") return false;
  }

  // Round state
  if (typeof s.round !== "number" || !Number.isFinite(s.round) || !Number.isInteger(s.round) || s.round < 1) return false;
  if (s.gamePhase !== "night" && s.gamePhase !== "day") return false;

  // Setup helpers
  if (!s.roleCounts || typeof s.roleCounts !== "object" || Array.isArray(s.roleCounts)) return false;
  for (const [, count] of Object.entries(s.roleCounts)) {
    if (typeof count !== "number" || !Number.isFinite(count) || !Number.isInteger(count) || count < 0) return false;
  }
  if (s.assignMode !== null && s.assignMode !== "random" && s.assignMode !== "manual") return false;
  if (!s.manualAssign || typeof s.manualAssign !== "object" || Array.isArray(s.manualAssign)) return false;
  for (const [, assignedRole] of Object.entries(s.manualAssign)) {
    if (assignedRole !== undefined && typeof assignedRole !== "string") return false;
  }

  // Night state
  if (typeof s.nightStepIdx !== "number" || !Number.isFinite(s.nightStepIdx) || !Number.isInteger(s.nightStepIdx) || s.nightStepIdx < 0) return false;
  if (s.nightVictim !== null && (typeof s.nightVictim !== "number" || !Number.isFinite(s.nightVictim) || !Number.isInteger(s.nightVictim) || s.nightVictim < 0)) return false;
  if (s.beschuetzerTarget === undefined) s.beschuetzerTarget = null;
  if (s.beschuetzerTarget !== null && (
    typeof s.beschuetzerTarget !== "number" ||
    !Number.isFinite(s.beschuetzerTarget) ||
    !Number.isInteger(s.beschuetzerTarget) ||
    s.beschuetzerTarget < 0
  )) return false;
  if (s.beschuetzerLastTarget === undefined) s.beschuetzerLastTarget = null;
  if (s.beschuetzerLastTarget !== null && (
    typeof s.beschuetzerLastTarget !== "number" ||
    !Number.isFinite(s.beschuetzerLastTarget) ||
    !Number.isInteger(s.beschuetzerLastTarget) ||
    s.beschuetzerLastTarget < 0
  )) return false;
  if (s.verfluchterConvertedThisNight === undefined) s.verfluchterConvertedThisNight = null;
  if (s.verfluchterConvertedThisNight !== null && (
    typeof s.verfluchterConvertedThisNight !== "number" ||
    !Number.isFinite(s.verfluchterConvertedThisNight) ||
    !Number.isInteger(s.verfluchterConvertedThisNight) ||
    s.verfluchterConvertedThisNight < 0
  )) return false;
  if (s.urwolfTransform !== null && typeof s.urwolfTransform !== "boolean") return false;
  if (typeof s.urwolfUsed !== "boolean") return false;
  if (s.seerTarget !== null && (typeof s.seerTarget !== "number" || !Number.isFinite(s.seerTarget) || !Number.isInteger(s.seerTarget) || s.seerTarget < 0)) return false;
  if (typeof s.seerRevealed !== "boolean") return false;
  if (s.auraSeerTarget !== null && (typeof s.auraSeerTarget !== "number" || !Number.isFinite(s.auraSeerTarget) || !Number.isInteger(s.auraSeerTarget) || s.auraSeerTarget < 0)) return false;
  if (typeof s.auraSeerRevealed !== "boolean") return false;
  if (!Array.isArray(s.detectivePicks)) return false;
  for (const pick of s.detectivePicks) {
    if (typeof pick !== "number" || !Number.isFinite(pick) || !Number.isInteger(pick) || pick < 0) return false;
  }
  if (typeof s.detectiveRevealed !== "boolean") return false;
  if (typeof s.witchHealUsed !== "boolean") return false;
  if (typeof s.witchPoisonUsed !== "boolean") return false;
  if (typeof s.witchHealThisRound !== "boolean") return false;
  if (s.witchPoisonTarget !== null && (typeof s.witchPoisonTarget !== "number" || !Number.isFinite(s.witchPoisonTarget) || !Number.isInteger(s.witchPoisonTarget) || s.witchPoisonTarget < 0)) return false;
  if (!Array.isArray(s.amorPick)) return false;
  for (const id of s.amorPick) {
    if (typeof id !== "number" || !Number.isFinite(id) || !Number.isInteger(id) || id < 0) return false;
  }
  if (typeof s.nightResolved !== "boolean") return false;

  // Day state
  if (!Array.isArray(s.dayDeaths)) return false;
  for (const d of s.dayDeaths) {
    if (!d || typeof d !== "object") return false;
    const did = (d as { id?: unknown }).id;
    if (typeof did !== "number" || !Number.isFinite(did) || !Number.isInteger(did) || did < 0) return false;
    if (typeof (d as { name?: unknown }).name !== "string") return false;
    if (typeof (d as { alive?: unknown }).alive !== "boolean") return false;
  }
  if (typeof s.dayVoteDone !== "boolean") return false;
  if (s.dayVoteVictimId !== null && (typeof s.dayVoteVictimId !== "number" || !Number.isFinite(s.dayVoteVictimId) || !Number.isInteger(s.dayVoteVictimId) || s.dayVoteVictimId < 0)) return false;

  // Trigger queue: each entry must have an integer victimId.
  if (!Array.isArray(s.triggerQueue)) return false;
  for (const t of s.triggerQueue) {
    if (!t || typeof t !== "object") return false;
    const vid = (t as { victimId?: unknown }).victimId;
    if (typeof vid !== "number" || !Number.isFinite(vid) || !Number.isInteger(vid) || vid < 0) return false;
  }

  // Log entries, winner, timers
  if (!Array.isArray(s.log)) return false;
  for (const entry of s.log) {
    if (!entry || typeof entry !== "object") return false;
    if (typeof (entry as { text?: unknown }).text !== "string") return false;
    const phase = (entry as { phase?: unknown }).phase;
    if (phase !== "day" && phase !== "night") return false;
  }
  if (s.winner !== null && (typeof s.winner !== "string" || !WIN_REASON_SET.has(s.winner as WinReason))) return false;
  if (typeof s.winMode !== "string" || !WIN_MODE_SET.has(s.winMode as WinMode)) return false;
  if (typeof s.revealMode !== "string" || !REVEAL_MODE_SET.has(s.revealMode as RevealMode)) return false;
  if (typeof s.roleReveal !== "boolean") return false;
  if (!Number.isFinite(s.timerDuration) || (s.timerDuration as number) < 0) return false;
  if (!Number.isFinite(s.dayTimer) || (s.dayTimer as number) < 0) return false;

  return true;
}

export interface SaveLoadHook {
  loaded: boolean;
  showRestore: boolean;
  setShowRestore: Dispatch<SetStateAction<boolean>>;
  pendingRestore: SaveState | null;
  setPendingRestore: Dispatch<SetStateAction<SaveState | null>>;
  /** Call with the current state snapshot to persist to localStorage */
  saveGame: (state: SaveState) => void;
  deleteSave: () => void;
}

export function useSaveLoad(): SaveLoadHook {
  const [loaded, setLoaded] = useState(false);
  const [showRestore, setShowRestore] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<SaveState | null>(null);

  // On first render: check for a saved game
  useEffect(() => {
    if (loaded) return;
    (() => {
      try {
        const saved = localStorage.getItem("werwolf-save");
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (isSaveState(parsed)) {
            setPendingRestore(parsed);
            setShowRestore(true);
          }
        }
      } catch {
        // Corrupted save: ignore.
      }
      setLoaded(true);
    })();
  }, [loaded]);

  const saveGame = useCallback((state: SaveState) => {
    try {
      localStorage.setItem("werwolf-save", JSON.stringify(state));
    } catch {
      // localStorage might be unavailable (private mode, quota exceeded)
    }
  }, []);

  const deleteSave = useCallback(() => {
    try {
      localStorage.removeItem("werwolf-save");
    } catch {
      // ignore
    }
  }, []);

  return {
    loaded,
    showRestore, setShowRestore,
    pendingRestore, setPendingRestore,
    saveGame,
    deleteSave,
  };
}
