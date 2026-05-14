import type { Prefs, RevealMode, WinMode, WinReason } from "../types";

export const WIN_MODES = ["standard", "extended"] as const satisfies readonly WinMode[];
export const REVEAL_MODES = ["hidden", "team", "role"] as const satisfies readonly RevealMode[];
export const WIN_REASONS = ["village", "wolves", "narr", "dorftrottel", "lovers"] as const satisfies readonly WinReason[];

export const WIN_MODE_SET = new Set<WinMode>(WIN_MODES);
export const REVEAL_MODE_SET = new Set<RevealMode>(REVEAL_MODES);
export const WIN_REASON_SET = new Set<WinReason>(WIN_REASONS);

export const DEFAULT_PREFS: Prefs = {
  winMode: "standard",
  revealMode: "role",
  roleReveal: false,
};
