import { PlayerChip } from "../ui/PlayerChip";
import { Btn } from "../ui/Btn";
import type { Player } from "../../types";

interface NightStepLoversProps {
  players: Player[];
  amorPick: number[];
  addLog: (text: string) => void;
  advanceNightStep: () => void;
}

export function NightStepLovers({ players, amorPick, addLog, advanceNightStep }: NightStepLoversProps) {
  const lover1 = players.find(p => p.id === amorPick[0]);
  const lover2 = players.find(p => p.id === amorPick[1]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400">Die Liebenden öffnen ihre Augen und sehen sich:</p>
      <div className="flex flex-wrap justify-center gap-2">
        {lover1 && <PlayerChip p={lover1} />}
        {lover2 && <PlayerChip p={lover2} />}
      </div>
      <Btn
        onClick={() => {
          addLog(`💕 Die Liebenden erwachen: ${lover1?.name ?? "Unbekannt"} und ${lover2?.name ?? "Unbekannt"} sehen sich.`);
          advanceNightStep();
        }}
        cls="bg-pink-600 hover:bg-pink-500 text-white w-full"
        size="lg"
      >
        Weiter →
      </Btn>
    </div>
  );
}
