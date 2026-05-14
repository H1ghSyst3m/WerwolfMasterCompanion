import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ROLES } from "../../constants/roles";
import { Btn } from "../ui/Btn";
import { RoleInfoModal } from "../ui/RoleInfoModal";
import { SetupScreenShell } from "./SetupScreenShell";
import type { RoleId, RoleCounts, WinMode, RevealMode } from "../../types";

interface SetupStep2Props {
  players: { length: number };
  roleCounts: RoleCounts;
  setRoleCounts: Dispatch<SetStateAction<RoleCounts>>;
  roleInfoId: RoleId | null;
  setRoleInfoId: (id: RoleId | null) => void;
  winMode: WinMode;
  setWinMode: (mode: WinMode) => void;
  revealMode: RevealMode;
  setRevealMode: (mode: RevealMode) => void;
  roleReveal: boolean;
  setRoleReveal: (v: boolean) => void;
  hideRoleReveal?: boolean;
  onBack: () => void;
  onNext: () => void;
}

export function SetupStep2({
  players,
  roleCounts,
  setRoleCounts,
  roleInfoId,
  setRoleInfoId,
  winMode,
  setWinMode,
  revealMode,
  setRevealMode,
  roleReveal,
  setRoleReveal,
  hideRoleReveal = false,
  onBack,
  onNext,
}: SetupStep2Props) {
  const n = players.length;
  const suggested = Math.max(1, Math.floor(n / 4));
  const totalRoles = Object.values(roleCounts).reduce<number>((a, b) => a + (b ?? 0), 0);

  const [rulesOpen, setRulesOpen] = useState(false);

  return (
    <SetupScreenShell
      step={2}
      title="Rollen auswählen"
      onBack={onBack}
      footer={
        <Btn
          onClick={onNext}
          cls="bg-purple-600 hover:bg-purple-500 text-white w-full"
          size="lg"
          disabled={totalRoles !== n}
        >
          Weiter: Rollen zuweisen →
        </Btn>
      }
    >
      <p className="text-gray-400 text-sm mb-2">Empfohlen: {suggested} Werwölfe für {n} Spieler</p>
      <p className={`text-sm mb-4 font-semibold ${totalRoles === n ? "text-green-400" : totalRoles > n ? "text-red-400" : "text-amber-400"}`}>
        {totalRoles}/{n} Rollen vergeben
      </p>

      {/* Spielregeln (collapsible) */}
      <div className="mb-4 rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
        <button
          onClick={() => setRulesOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-300 hover:text-white"
          aria-expanded={rulesOpen}
        >
          <span>⚙️ Spielregeln</span>
          <span className="text-gray-500 text-xs">{rulesOpen ? "▲" : "▼"}</span>
        </button>

        {rulesOpen && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-800 pt-3">
            {/* Win condition mode */}
            <div>
              <p className="text-xs text-gray-400 mb-2">Siegbedingung Werwölfe</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setWinMode("standard")}
                  aria-pressed={winMode === "standard"}
                  className={`flex-1 flex flex-col items-center rounded-lg px-3 py-2 text-sm font-semibold border transition-colors ${
                    winMode === "standard"
                      ? "bg-purple-700 border-purple-500 text-white"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
                  }`}
                >
                  Standard
                  <span className="text-xs font-normal mt-0.5 opacity-75">Sofort wenn Wölfe ≥ Dorf</span>
                </button>
                <button
                  onClick={() => setWinMode("extended")}
                  aria-pressed={winMode === "extended"}
                  className={`flex-1 flex flex-col items-center rounded-lg px-3 py-2 text-sm font-semibold border transition-colors ${
                    winMode === "extended"
                      ? "bg-purple-700 border-purple-500 text-white"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
                  }`}
                >
                  Erweitert
                  <span className="text-xs font-normal mt-0.5 opacity-75">Verzögert bei Jäger / Hexe</span>
                </button>
              </div>
            </div>
            {/* Reveal mode after day vote elimination */}
            <div>
              <p className="text-xs text-gray-400 mb-2">Aufdecken nach Hinrichtung</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setRevealMode("hidden")}
                  aria-pressed={revealMode === "hidden"}
                  className={`flex-1 flex flex-col items-center rounded-lg px-3 py-2 text-sm font-semibold border transition-colors ${
                    revealMode === "hidden"
                      ? "bg-purple-700 border-purple-500 text-white"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
                  }`}
                >
                  Verborgen
                  <span className="text-xs font-normal mt-0.5 opacity-75">Nichts anzeigen</span>
                </button>
                <button
                  onClick={() => setRevealMode("team")}
                  aria-pressed={revealMode === "team"}
                  className={`flex-1 flex flex-col items-center rounded-lg px-3 py-2 text-sm font-semibold border transition-colors ${
                    revealMode === "team"
                      ? "bg-purple-700 border-purple-500 text-white"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
                  }`}
                >
                  Team
                  <span className="text-xs font-normal mt-0.5 opacity-75">Gut oder Böse</span>
                </button>
                <button
                  onClick={() => setRevealMode("role")}
                  aria-pressed={revealMode === "role"}
                  className={`flex-1 flex flex-col items-center rounded-lg px-3 py-2 text-sm font-semibold border transition-colors ${
                    revealMode === "role"
                      ? "bg-purple-700 border-purple-500 text-white"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
                  }`}
                >
                  Rolle
                  <span className="text-xs font-normal mt-0.5 opacity-75">Exakte Rolle</span>
                </button>
              </div>
            </div>
            {/* Role reveal at game start */}
            {!hideRoleReveal && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Rollenaufdeckung</p>
                <p className="text-xs text-gray-400 mt-0.5">Spieler sehen ihre Rolle vor dem Spiel</p>
              </div>
              <button
                onClick={() => setRoleReveal(!roleReveal)}
                aria-pressed={roleReveal}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  roleReveal ? "bg-purple-600" : "bg-gray-700"
                }`}
                aria-label="Rollenaufdeckung umschalten"
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    roleReveal ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            )}
          </div>
        )}
      </div>

      {(["classic", "special"] as const).map(cat => (
        <div key={cat}>
          <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-2">
            {cat === "classic" ? "Klassisch" : "Spezial"}
          </h3>
          <div className="space-y-2 mb-4">
            {(Object.entries(ROLES) as [RoleId, typeof ROLES[RoleId]][])
              .filter(([, r]) => r.cat === cat)
              .map(([id, r]) => {
                const c = roleCounts[id] ?? 0;
                const max = r.unique ? 1 : n;
                return (
                  <div key={id} className="flex items-center justify-between bg-gray-900 rounded-xl px-4 py-3 border border-gray-800">
                    <div className="flex items-center gap-2">
                      <span>{r.icon} {r.name}</span>
                      <button onClick={() => setRoleInfoId(id)} className="text-gray-500 hover:text-gray-300 text-sm" aria-label={`Mehr Informationen zu ${r.name}`}>ℹ️</button>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        aria-label={`${r.name} verringern`}
                        onClick={() => setRoleCounts(prev => ({ ...prev, [id]: Math.max(0, c - 1) }))}
                        className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-lg font-bold"
                      >−</button>
                      <span className="w-6 text-center font-bold">{c}</span>
                      <button
                        aria-label={`${r.name} erhöhen`}
                        onClick={() => setRoleCounts(prev => ({ ...prev, [id]: Math.min(max, c + 1) }))}
                        className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-lg font-bold"
                      >+</button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      {roleInfoId && <RoleInfoModal roleId={roleInfoId} onClose={() => setRoleInfoId(null)} />}
    </SetupScreenShell>
  );
}
