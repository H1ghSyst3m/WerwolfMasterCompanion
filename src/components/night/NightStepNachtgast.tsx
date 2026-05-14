import { PlayerChip } from "../ui/PlayerChip";
import { Btn } from "../ui/Btn";
import type { Player } from "../../types";

interface NightStepNachtgastProps {
  alive: Player[];
  nachtgastTarget: number | null;
  setNachtgastTarget: (id: number) => void;
  addLog: (text: string) => void;
  advanceNightStep: () => void;
}

export function NightStepNachtgast({
  alive,
  nachtgastTarget,
  setNachtgastTarget,
  addLog,
  advanceNightStep,
}: NightStepNachtgastProps) {
  const candidates = alive.filter(p => p.role !== "nachtgast");
  const target = nachtgastTarget !== null ? candidates.find(p => p.id === nachtgastTarget) : null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400">Bei wem übernachtet der Nachtgast?</p>
      <div className="space-y-2">
        {candidates.map(p => (
          <PlayerChip
            key={p.id}
            p={p}
            selected={nachtgastTarget === p.id}
            onClick={() => setNachtgastTarget(p.id)}
          />
        ))}
      </div>
      {candidates.length === 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-sm text-gray-300">
          Kein gültiger Gastgeber verfügbar.
        </div>
      )}
      <Btn
        onClick={() => {
          if (target) addLog(`🛏️ Nachtgast übernachtet bei ${target.name}.`);
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
