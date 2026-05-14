import { useState, useCallback, useEffect } from "react";
import type { Prefs, WinMode, RevealMode } from "../types";
import { DEFAULT_PREFS, REVEAL_MODE_SET, WIN_MODE_SET } from "../constants/gameOptions";

const PREFS_KEY = "werwolf-prefs";

export interface PrefsHook {
  winMode: WinMode;
  revealMode: RevealMode;
  roleReveal: boolean;
  setWinMode: (m: WinMode) => void;
  setRevealMode: (m: RevealMode) => void;
  setRoleReveal: (v: boolean) => void;
  /** Bulk-update all preferences at once. Used by `restoreState`. */
  setPrefs: (p: Prefs) => void;
  reset: () => void;
}

function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        const p = parsed as Record<string, unknown>;
        const winMode: WinMode =
          typeof p["winMode"] === "string" && WIN_MODE_SET.has(p["winMode"] as WinMode)
            ? (p["winMode"] as WinMode)
            : DEFAULT_PREFS.winMode;
        const revealMode: RevealMode =
          typeof p["revealMode"] === "string" && REVEAL_MODE_SET.has(p["revealMode"] as RevealMode)
            ? (p["revealMode"] as RevealMode)
            : DEFAULT_PREFS.revealMode;
        const roleReveal: boolean = p["roleReveal"] === true ? true : DEFAULT_PREFS.roleReveal;
        return { winMode, revealMode, roleReveal };
      }
    }
  } catch {
    // Ignore corrupted or unavailable storage.
  }
  return { ...DEFAULT_PREFS };
}

export function usePrefs(): PrefsHook {
  const [state, setState] = useState<Prefs>(readPrefs);
  const { winMode, revealMode, roleReveal } = state;

  const setWinMode = useCallback((wm: WinMode) => setState(p => ({ ...p, winMode: wm })), []);
  const setRevealMode = useCallback((rm: RevealMode) => setState(p => ({ ...p, revealMode: rm })), []);
  const setRoleReveal = useCallback((v: boolean) => setState(p => ({ ...p, roleReveal: v })), []);
  const setPrefs = useCallback((p: Prefs) => setState(p), []);

  // Persists the full Prefs object whenever any field changes.
  // Depending on `state` ensures new fields are automatically captured
  // when the Prefs interface is extended in the future.
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(state));
    } catch {
      // localStorage unavailable: ignore.
    }
  }, [state]);

  const reset = useCallback(() => setState(readPrefs()), []);

  return { winMode, revealMode, roleReveal, setWinMode, setRevealMode, setRoleReveal, setPrefs, reset };
}
