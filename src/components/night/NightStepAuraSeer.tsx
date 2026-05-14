import { PlayerChip } from "../ui/PlayerChip";
import { Btn } from "../ui/Btn";
import type { Player } from "../../types";

interface NightStepAuraSeerProps {
  alive: Player[];
  players: Player[];
  auraSeerTarget: number | null;
  setAuraSeerTarget: (id: number) => void;
  auraSeerRevealed: boolean;
  setAuraSeerRevealed: (v: boolean) => void;
  getEffectiveTeam: (playerId: number) => "wolf" | "village";
  addLog: (text: string) => void;
  advanceNightStep: () => void;
}

export function NightStepAuraSeer({
  alive,
  players,
  auraSeerTarget,
  setAuraSeerTarget,
  auraSeerRevealed,
  setAuraSeerRevealed,
  getEffectiveTeam,
  addLog,
  advanceNightStep,
}: NightStepAuraSeerProps) {
  const targetPlayer = auraSeerTarget != null ? players.find(p => p.id === auraSeerTarget) : null;
  const team = auraSeerTarget != null ? getEffectiveTeam(auraSeerTarget) : null;
  const isEvil = team === "wolf";

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400">Welchen Spieler überprüft der Aura-Seher?</p>
      <div className="space-y-2">
        {alive.filter(p => p.role !== "auraseher").map(p => (
          <PlayerChip
            key={p.id}
            p={p}
            selected={auraSeerTarget === p.id}
            onClick={() => { setAuraSeerTarget(p.id); setAuraSeerRevealed(true); }}
          />
        ))}
      </div>
      {auraSeerRevealed && targetPlayer && (
        <div className={`border rounded-xl p-4 text-center ${isEvil ? "bg-red-900/40 border-red-600" : "bg-green-900/40 border-green-600"}`}>
          <p className="text-sm text-gray-400 mb-1">{targetPlayer.name} ist:</p>
          <p className={`text-2xl font-bold ${isEvil ? "text-red-400" : "text-green-400"}`}>
            {isEvil ? "🐺 Böse" : "🏘️ Gut"}
          </p>
        </div>
      )}
      <Btn
        onClick={() => {
          addLog(`🔮 Aura-Seher überprüft ${targetPlayer?.name ?? "Unbekannt"}: ${isEvil ? "Böse" : "Gut"}.`);
          advanceNightStep();
        }}
        cls="bg-indigo-600 hover:bg-indigo-500 text-white w-full"
        size="lg"
        disabled={auraSeerTarget == null}
      >
        Weiter →
      </Btn>
    </div>
  );
}
