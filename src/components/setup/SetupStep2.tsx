import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ROLES } from "../../constants/roles";
import { autoFillVillagers, nonVillagerRoleTotal, roleCountTotal } from "../../domain/gameState";
import { Btn } from "../ui/Btn";
import { RoleInfoModal } from "../ui/RoleInfoModal";
import { SetupScreenShell } from "./SetupScreenShell";
import type { RoleId, RoleCounts, WinMode, RevealMode } from "../../types";

type RoleCategory = "classic" | "special";
type RoleGroup = "wolf" | "village" | "specialGoal";

const SPECIAL_GOAL_ROLES = new Set<RoleId>(["narr", "dorftrottel"]);

const ROLE_CATEGORY_LABELS: Record<RoleCategory, string> = {
  classic: "Klassisch",
  special: "Spezial",
};

const ROLE_GROUP_LABELS: Record<RoleGroup, string> = {
  wolf: "Wolf-Team",
  village: "Dorf-Team",
  specialGoal: "Sonderziel",
};

function getRoleGroup(roleId: RoleId): RoleGroup {
  if (ROLES[roleId].team === "wolf") return "wolf";
  if (SPECIAL_GOAL_ROLES.has(roleId)) return "specialGoal";
  return "village";
}

function roleGroupClasses(group: RoleGroup): { badge: string; border: string; text: string } {
  if (group === "wolf") {
    return {
      badge: "border-red-800 bg-red-950/50 text-red-300",
      border: "border-l-red-600",
      text: "text-red-300",
    };
  }
  if (group === "specialGoal") {
    return {
      badge: "border-amber-800 bg-amber-950/50 text-amber-300",
      border: "border-l-amber-500",
      text: "text-amber-300",
    };
  }
  return {
    badge: "border-sky-800 bg-sky-950/50 text-sky-300",
    border: "border-l-sky-500",
    text: "text-sky-300",
  };
}

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
  headerAction?: ReactNode;
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
  headerAction,
  onBack,
  onNext,
}: SetupStep2Props) {
  const n = players.length;
  const suggested = Math.max(1, Math.floor(n / 4));
  const displayRoleCounts = useMemo(() => autoFillVillagers(roleCounts, n), [roleCounts, n]);
  const totalRoles = roleCountTotal(displayRoleCounts);
  const nonVillagerRoles = nonVillagerRoleTotal(displayRoleCounts);
  const freeSlots = n - nonVillagerRoles;
  const overLimit = freeSlots < 0;
  const statusText = overLimit
    ? `${Math.abs(freeSlots)} zu viel`
    : freeSlots > 0
      ? `${freeSlots} Dorfplätze`
      : "Voll";
  const statusClass = overLimit
    ? "border-red-800 bg-red-950/50 text-red-300"
    : freeSlots > 0
      ? "border-amber-800 bg-amber-950/40 text-amber-300"
      : "border-green-800 bg-green-950/40 text-green-300";

  const villagerCount = displayRoleCounts.dorfbewohner ?? 0;
  const selectedRoles = (Object.entries(ROLES) as [RoleId, typeof ROLES[RoleId]][])
    .map(([id, role]) => ({ id, role, count: displayRoleCounts[id] ?? 0 }))
    .filter(({ id, count }) => id !== "dorfbewohner" && count > 0);
  const wolfCount = (Object.entries(displayRoleCounts) as [RoleId, number][])
    .reduce((total, [id, count]) => total + (ROLES[id]?.team === "wolf" ? count : 0), 0);
  const specialGoalCount = (Object.entries(displayRoleCounts) as [RoleId, number][])
    .reduce((total, [id, count]) => total + (SPECIAL_GOAL_ROLES.has(id) ? count : 0), 0);
  const villageTeamCount = totalRoles - wolfCount - specialGoalCount;
  const balanceHint = wolfCount > suggested
    ? "Viele Wölfe"
    : wolfCount < suggested
      ? "Wenig Wölfe"
      : "Ausgewogen";
  const balanceHintClass = wolfCount > suggested
    ? "text-amber-300"
    : wolfCount < suggested
      ? "text-sky-300"
      : "text-green-300";
  const [activeCategory, setActiveCategory] = useState<RoleCategory>("classic");

  const updateRoleCount = (roleId: RoleId, count: number) => {
    setRoleCounts(prev => autoFillVillagers({ ...prev, [roleId]: count }, n));
  };

  const [rulesOpen, setRulesOpen] = useState(false);

  return (
    <SetupScreenShell
      step={2}
      title="Rollen auswählen"
      headerAction={headerAction}
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
      <div className="mb-4 rounded-2xl border border-gray-800 bg-gray-900/80 p-3">
        <div className="grid grid-cols-3 divide-x divide-gray-800 text-center">
          <div className="px-2">
            <p className="text-lg font-bold text-white">{n}</p>
            <p className="text-[11px] uppercase text-gray-500">Spieler</p>
          </div>
          <div className="px-2">
            <p className={`text-lg font-bold ${totalRoles === n ? "text-green-400" : totalRoles > n ? "text-red-400" : "text-amber-400"}`}>
              {totalRoles}/{n}
            </p>
            <p className="text-[11px] uppercase text-gray-500">Rollen</p>
          </div>
          <div className="px-2">
            <p className={`text-lg font-bold ${overLimit ? "text-red-300" : freeSlots > 0 ? "text-amber-300" : "text-green-400"}`}>
              {overLimit ? Math.abs(freeSlots) : Math.max(0, freeSlots)}
            </p>
            <p className="text-[11px] uppercase text-gray-500">{overLimit ? "Zu viel" : "Dorfplätze"}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-gray-800 bg-gray-950/70 px-3 py-2">
          <div>
            <p className="text-sm font-semibold">Balance</p>
            <p className={`text-xs font-medium ${balanceHintClass}`}>{balanceHint} · empfohlen {suggested}</p>
          </div>
          <span className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
            {statusText}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-red-900/70 bg-red-950/25 px-3 py-2">
            <p className="text-base font-bold text-red-300">{wolfCount}</p>
            <p className="text-[11px] text-red-200/70">Wolf-Team</p>
          </div>
          <div className="rounded-xl border border-sky-900/70 bg-sky-950/25 px-3 py-2">
            <p className="text-base font-bold text-sky-300">{villageTeamCount}</p>
            <p className="text-[11px] text-sky-200/70">Dorf-Seite</p>
          </div>
          <div className="rounded-xl border border-amber-900/70 bg-amber-950/25 px-3 py-2">
            <p className="text-base font-bold text-amber-300">{specialGoalCount}</p>
            <p className="text-[11px] text-amber-200/70">Sonderziel</p>
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-green-900/70 bg-green-950/25 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-green-200">Dorfbewohner automatisch: {villagerCount}</p>
            <p className="mt-0.5 text-xs text-green-100/60">Füllt freie Dorfplätze bis zur Spielerzahl auf.</p>
          </div>
          <span className="shrink-0 rounded-lg border border-green-700 bg-green-900/50 px-2 py-1 text-xs font-bold text-green-200">
            Auto
          </span>
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs uppercase tracking-wider text-gray-400">Ausgewählt</h3>
          <span className="text-xs text-gray-500">{selectedRoles.length} Rollenart{selectedRoles.length === 1 ? "" : "en"}</span>
        </div>
        {selectedRoles.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {selectedRoles.map(({ id, role, count }) => {
              const group = getRoleGroup(id);
              const tone = roleGroupClasses(group);
              return (
                <div key={id} className={`shrink-0 rounded-xl border px-3 py-2 ${tone.badge}`}>
                  <p className="text-sm font-bold">{role.icon} {count} {role.name}</p>
                  <p className="text-[11px] opacity-80">{ROLE_GROUP_LABELS[group]}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900 px-3 py-3 text-sm text-gray-400">
            Noch keine Zusatzrollen gewählt.
          </div>
        )}
      </div>

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

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-gray-800 bg-gray-900 p-1">
        {(["classic", "special"] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            aria-pressed={activeCategory === cat}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              activeCategory === cat
                ? "bg-purple-700 text-white shadow"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            {ROLE_CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {(["wolf", "village", "specialGoal"] as const).map(group => {
          const roles = (Object.entries(ROLES) as [RoleId, typeof ROLES[RoleId]][])
            .filter(([id, role]) => id !== "dorfbewohner" && role.cat === activeCategory && getRoleGroup(id) === group);
          if (roles.length === 0) return null;
          const tone = roleGroupClasses(group);
          return (
            <section key={group}>
              <h3 className={`mb-2 text-xs font-bold uppercase tracking-wider ${tone.text}`}>
                {ROLE_GROUP_LABELS[group]}
              </h3>
              <div className="space-y-2">
                {roles.map(([id, r]) => {
                  const c = displayRoleCounts[id] ?? 0;
                  const max = r.unique ? 1 : n;
                  const canDecrease = c > 0;
                  const canIncrease = c < max && freeSlots > 0;
                  return (
                    <div key={id} className={`border-l-4 ${tone.border} flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 px-3 py-3`}>
                      <div className="min-w-0 flex flex-1 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-800 text-xl">{r.icon}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-semibold">{r.name}</p>
                            <button onClick={() => setRoleInfoId(id)} className="text-gray-500 hover:text-gray-300 text-xs" aria-label={`Mehr Informationen zu ${r.name}`}>ℹ️</button>
                          </div>
                          <p className={`mt-0.5 text-xs ${tone.text}`}>
                            {ROLE_GROUP_LABELS[getRoleGroup(id)]}{r.unique ? " · Einzigartig" : " · Mehrfach"}
                          </p>
                        </div>
                      </div>
                      <div className="ml-3 grid grid-cols-[2rem_2rem_2rem] items-center overflow-hidden rounded-xl border border-gray-700 bg-gray-950">
                        <button
                          aria-label={`${r.name} verringern`}
                          onClick={() => updateRoleCount(id, Math.max(0, c - 1))}
                          disabled={!canDecrease}
                          className="h-9 bg-gray-800 text-lg font-bold transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-900 disabled:text-gray-700"
                        >−</button>
                        <span className="text-center font-bold">{c}</span>
                        <button
                          aria-label={`${r.name} erhöhen`}
                          onClick={() => updateRoleCount(id, Math.min(max, c + 1))}
                          disabled={!canIncrease}
                          className="h-9 bg-gray-800 text-lg font-bold transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-900 disabled:text-gray-700"
                        >+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {roleInfoId && <RoleInfoModal roleId={roleInfoId} onClose={() => setRoleInfoId(null)} />}
    </SetupScreenShell>
  );
}
