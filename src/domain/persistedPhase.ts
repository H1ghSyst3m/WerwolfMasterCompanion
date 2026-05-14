import type { PersistedPhase } from "../types";

export function normalizePersistedPhase(phase: unknown): PersistedPhase | null {
  if (phase === "rolereveal") return "roleReveal";
  if (phase === "roleReveal" || phase === "playing" || phase === "ended") return phase;
  return null;
}
