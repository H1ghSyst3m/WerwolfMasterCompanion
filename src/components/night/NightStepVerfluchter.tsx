import { Btn } from "../ui/Btn";
import type { Player } from "../../types";

interface NightStepVerfluchterProps {
  players: Player[];
  convertedPlayerId: number | null;
  advanceNightStep: () => void;
}

export function NightStepVerfluchter({
  players,
  convertedPlayerId,
  advanceNightStep,
}: NightStepVerfluchterProps) {
  const convertedPlayer = convertedPlayerId !== null
    ? players.find(player => player.id === convertedPlayerId)
    : null;

  return (
    <div className="space-y-3">
      <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-center">
        <p className="text-sm text-gray-400 mb-2">Nur für die Spielleitung</p>
        <p className="text-lg font-semibold">
          {convertedPlayer?.name ?? "Der Verfluchte"} ist jetzt Werwolf.
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Tippe die Person leise an. Ab der nächsten Werwolfphase wacht sie mit den Werwölfen auf.
        </p>
      </div>
      <Btn onClick={advanceNightStep} cls="bg-red-700 hover:bg-red-600 text-white w-full" size="lg">
        Informiert →
      </Btn>
    </div>
  );
}
