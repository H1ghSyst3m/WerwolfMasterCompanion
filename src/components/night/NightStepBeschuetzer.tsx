import { PlayerChip } from "../ui/PlayerChip";
import { Btn } from "../ui/Btn";
import type { Player } from "../../types";

interface NightStepBeschuetzerProps {
  alive: Player[];
  beschuetzerTarget: number | null;
  beschuetzerLastTarget: number | null;
  setBeschuetzerTarget: (id: number) => void;
  addLog: (text: string) => void;
  advanceNightStep: () => void;
}

export function NightStepBeschuetzer({
  alive,
  beschuetzerTarget,
  beschuetzerLastTarget,
  setBeschuetzerTarget,
  addLog,
  advanceNightStep,
}: NightStepBeschuetzerProps) {
  const beschuetzer = alive.find(player => player.role === "beschuetzer");
  const candidates = alive.filter(player =>
    player.id !== beschuetzer?.id && player.id !== beschuetzerLastTarget
  );
  const target = beschuetzerTarget !== null ? candidates.find(player => player.id === beschuetzerTarget) : null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400">Wen schützt der Beschützer diese Nacht?</p>
      <div className="space-y-2">
        {candidates.map(player => (
          <PlayerChip
            key={player.id}
            p={player}
            selected={beschuetzerTarget === player.id}
            onClick={() => setBeschuetzerTarget(player.id)}
          />
        ))}
      </div>
      {candidates.length === 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-sm text-gray-300">
          Kein gültiges Schutzziel verfügbar.
        </div>
      )}
      <Btn
        onClick={() => {
          if (target) addLog(`🛡️ Beschützer schützt ${target.name}.`);
          advanceNightStep();
        }}
        cls="bg-indigo-600 hover:bg-indigo-500 text-white w-full"
        size="lg"
        disabled={candidates.length > 0 && !target}
      >
        Weiter →
      </Btn>
    </div>
  );
}
