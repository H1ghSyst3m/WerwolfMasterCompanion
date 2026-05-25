import { Btn } from "../ui/Btn";
import type { Player } from "../../types";

interface NightStepHarterBurscheProps {
  players: Player[];
  woundedPlayerId: number | null;
  advanceNightStep: () => void;
}

export function NightStepHarterBursche({
  players,
  woundedPlayerId,
  advanceNightStep,
}: NightStepHarterBurscheProps) {
  const woundedPlayer = players.find(player => player.id === woundedPlayerId);

  return (
    <div className="space-y-4">
      <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-4 text-center">
        <p className="font-semibold mb-2">
          {woundedPlayer?.name ?? "Der Harte Bursche"} wurde von den Werwölfen getroffen.
        </p>
        <p className="text-sm text-gray-300">
          Tippe die Person leise an. Sie lebt noch diesen Tag und stirbt im nächsten Nachtbericht an ihren Wunden.
        </p>
      </div>
      <Btn onClick={advanceNightStep} cls="bg-purple-600 hover:bg-purple-500 text-white w-full" size="lg">
        Weiter →
      </Btn>
    </div>
  );
}
