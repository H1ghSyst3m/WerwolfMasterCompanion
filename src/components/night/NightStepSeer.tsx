import { getRoleDisplay } from "../../domain/roleDisplay";
import { PlayerChip } from "../ui/PlayerChip";
import { Btn } from "../ui/Btn";
import type { Player, RoleId } from "../../types";

interface NightStepSeerProps {
  alive: Player[];
  players: Player[];
  seerTarget: number | null;
  setSeerTarget: (id: number) => void;
  seerRevealed: boolean;
  setSeerRevealed: (v: boolean) => void;
  getEffectiveRole: (playerId: number) => RoleId | null | undefined;
  addLog: (text: string) => void;
  advanceNightStep: () => void;
}

export function NightStepSeer({
  alive,
  players,
  seerTarget,
  setSeerTarget,
  seerRevealed,
  setSeerRevealed,
  getEffectiveRole,
  addLog,
  advanceNightStep,
}: NightStepSeerProps) {
  const targetPlayer = seerTarget != null ? players.find(p => p.id === seerTarget) : null;
  const effectiveRole = seerTarget != null ? getEffectiveRole(seerTarget) : null;
  const revealedRole = targetPlayer ? getRoleDisplay(targetPlayer, effectiveRole) : null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400">Welchen Spieler überprüft der Seher?</p>
      <div className="space-y-2">
        {alive.filter(p => p.role !== "seher").map(p => (
          <PlayerChip
            key={p.id}
            p={p}
            selected={seerTarget === p.id}
            onClick={() => { setSeerTarget(p.id); setSeerRevealed(true); }}
          />
        ))}
      </div>
      {seerRevealed && targetPlayer && revealedRole && (
        <div className="bg-indigo-900/50 border border-indigo-600 rounded-xl p-4 text-center">
          <p className="text-lg">
            {targetPlayer.name} ist:{" "}
            <span className="font-bold ml-1">{revealedRole.labelWithIcon}</span>
          </p>
        </div>
      )}
      <Btn
        onClick={() => { addLog(`👁️ Seher überprüft ${targetPlayer?.name ?? "unbekannt"}.`); advanceNightStep(); }}
        cls="bg-indigo-600 hover:bg-indigo-500 text-white w-full"
        size="lg"
        disabled={seerTarget == null}
      >
        Weiter →
      </Btn>
    </div>
  );
}
