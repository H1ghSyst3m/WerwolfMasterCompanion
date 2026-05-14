import { useMemo, useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ROLES } from "../../constants/roles";
import { Btn } from "../ui/Btn";
import { SetupScreenShell } from "./SetupScreenShell";
import type { Player, RoleId, RoleCounts, ManualAssign } from "../../types";

interface SetupStep3Props {
  players: Player[];
  roleCounts: RoleCounts;
  assignMode: "random" | "manual" | null;
  manualAssign: ManualAssign;
  setAssignMode: (mode: "random" | "manual" | null) => void;
  setManualAssign: Dispatch<SetStateAction<ManualAssign>>;
  setPlayers: Dispatch<SetStateAction<Player[]>>;
  shuffleRoles: () => void;
  startGame: () => void;
  onBack: () => void;
}

export function SetupStep3({
  players,
  roleCounts,
  assignMode,
  manualAssign,
  setAssignMode,
  setManualAssign,
  setPlayers,
  shuffleRoles,
  startGame,
  onBack,
}: SetupStep3Props) {
  const assignedCounts = useMemo(() => {
    const c: Partial<Record<RoleId, number>> = {};
    Object.values(manualAssign).forEach(r => {
      if (r) c[r] = (c[r] ?? 0) + 1;
    });
    return c;
  }, [manualAssign]);

  const getRemainingForPlayer = useCallback((playerId: number) => {
    const opts: { roleId: RoleId }[] = [];
    (Object.entries(roleCounts) as [RoleId, number][]).forEach(([roleId, total]) => {
      if (!total || total <= 0) return;
      const usedByOthers = Object.entries(manualAssign).filter(
        ([pid, r]) => r === roleId && pid !== String(playerId),
      ).length;
      if (total - usedByOthers > 0 || manualAssign[String(playerId)] === roleId) {
        opts.push({ roleId });
      }
    });
    return opts;
  }, [roleCounts, manualAssign]);

  const allManualAssigned = useMemo(() => {
    if (!players.every(p => manualAssign[p.id])) return false;
    return (Object.entries(roleCounts) as [RoleId, number][]).every(([roleId, total]) => {
      if (!total || total <= 0) return true;
      return (assignedCounts[roleId] ?? 0) === total;
    });
  }, [players, manualAssign, roleCounts, assignedCounts]);

  // Unified back handler used by the header back button.
  const handleBack = useCallback(() => {
    if (assignMode === "random") {
      setPlayers(prev => prev.map(p => ({ ...p, role: null, originalRole: null })));
      setAssignMode(null);
    } else if (assignMode === "manual") {
      setManualAssign({});
      setAssignMode(null);
    } else {
      onBack();
    }
  }, [assignMode, setAssignMode, setManualAssign, setPlayers, onBack]);

  // Determine footer based on current assign mode.
  const footer = assignMode === "random" ? (
    <>
      <Btn onClick={startGame} cls="bg-green-600 hover:bg-green-500 text-white w-full" size="lg">
        🐺 Spiel starten!
      </Btn>
      <Btn onClick={shuffleRoles} cls="bg-gray-700 hover:bg-gray-600 text-white w-full" size="lg">
        🎲 Neu würfeln
      </Btn>
    </>
  ) : assignMode === "manual" ? (
    <>
      <Btn
        onClick={startGame}
        cls="bg-green-600 hover:bg-green-500 text-white w-full"
        size="lg"
        disabled={!allManualAssigned}
      >
        🐺 Spiel starten!
      </Btn>
      {!allManualAssigned && Object.keys(manualAssign).length > 0 && (
        <p className="text-amber-400 text-xs text-center">Alle Rollen müssen korrekt verteilt sein</p>
      )}
    </>
  ) : null;

  return (
    <SetupScreenShell
      step={3}
      title="Rollenzuweisung"
      onBack={handleBack}
      footer={footer}
    >
      {!assignMode ? (
        <div className="space-y-3">
          <Btn
            onClick={() => { setAssignMode("random"); shuffleRoles(); }}
            cls="bg-purple-600 hover:bg-purple-500 text-white w-full"
            size="lg"
          >
            🎲 Zufällig verteilen
          </Btn>
          <Btn
            onClick={() => setAssignMode("manual")}
            cls="bg-gray-700 hover:bg-gray-600 text-white w-full"
            size="lg"
          >
            ✏️ Manuell zuweisen
          </Btn>
        </div>
      ) : assignMode === "random" ? (
        <div className="space-y-4">
          <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 text-center">
            <p className="text-green-400 text-lg font-semibold">✓ Rollen wurden zufällig verteilt</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <h3 className="font-semibold mb-3 text-sm text-gray-400">Zugewiesene Rollen:</h3>
            <div className="space-y-2">
              {players.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-2.5">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-sm">{p.role ? ROLES[p.role]?.icon : ""} {p.role ? ROLES[p.role]?.name : ""}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-gray-400 text-sm mb-1">Weise jedem Spieler eine Rolle zu:</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(Object.entries(roleCounts) as [RoleId, number][])
              .filter(([, c]) => c > 0)
              .map(([id, c]) => {
                const used = assignedCounts[id] ?? 0;
                return (
                  <span
                    key={id}
                    className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      used >= c
                        ? "bg-green-900/50 text-green-400 border border-green-700"
                        : "bg-gray-800 text-gray-300 border border-gray-700"
                    }`}
                  >
                    {ROLES[id].icon} {used}/{c}
                  </span>
                );
              })}
          </div>
          {players.map(p => (
            <div key={p.id} className="flex items-center gap-2 bg-gray-900 rounded-xl px-4 py-3 border border-gray-800">
              <span className="flex-1 font-medium truncate">{p.name}</span>
              <select
                aria-label={`Rolle für ${p.name}`}
                value={manualAssign[p.id] ?? ""}
                onChange={e => setManualAssign(prev => ({
                  ...prev,
                  [p.id]: (e.target.value as RoleId) || undefined,
                }))}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white min-w-[140px]"
              >
                <option value="">Wählen...</option>
                {getRemainingForPlayer(p.id).map(({ roleId }) => (
                  <option key={roleId} value={roleId}>{ROLES[roleId].icon} {ROLES[roleId].name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </SetupScreenShell>
  );
}
