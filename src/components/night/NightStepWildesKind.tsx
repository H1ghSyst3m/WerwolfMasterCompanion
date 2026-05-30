import { PlayerChip } from "../ui/PlayerChip";
import { Btn } from "../ui/Btn";
import type { Player } from "../../types";

interface NightStepWildesKindProps {
  alive: Player[];
  wildesKindVorbild: number | null;
  setWildesKindVorbild: (id: number) => void;
  addLog: (text: string) => void;
  advanceNightStep: () => void;
}

export function NightStepWildesKind({
  alive,
  wildesKindVorbild,
  setWildesKindVorbild,
  addLog,
  advanceNightStep,
}: NightStepWildesKindProps) {
  const wildesKind = alive.find(player => player.role === "wildeskind");
  const candidates = alive.filter(player => player.id !== wildesKind?.id);
  const target = wildesKindVorbild !== null ? candidates.find(player => player.id === wildesKindVorbild) : null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400">Wähle ein Vorbild für das Wilde Kind:</p>
      <div className="space-y-2">
        {candidates.map(player => (
          <PlayerChip
            key={player.id}
            p={player}
            selected={wildesKindVorbild === player.id}
            onClick={() => setWildesKindVorbild(player.id)}
          />
        ))}
      </div>
      {candidates.length === 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-sm text-gray-300">
          Kein gültiges Vorbild verfügbar.
        </div>
      )}
      <Btn
        onClick={() => {
          if (target) addLog(`🌿 Wildes Kind wählt ${target.name} als Vorbild.`);
          advanceNightStep();
        }}
        cls="bg-emerald-700 hover:bg-emerald-600 text-white w-full"
        size="lg"
        disabled={candidates.length > 0 && !target}
      >
        Vorbild bestätigen →
      </Btn>
    </div>
  );
}
