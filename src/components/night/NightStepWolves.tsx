import { PlayerChip } from "../ui/PlayerChip";
import { Btn } from "../ui/Btn";
import type { Player } from "../../types";

interface NightStepWolvesProps {
  alive: Player[];
  nightVictim: number | null;
  setNightVictim: (id: number) => void;
  advanceNightStep: () => void;
  getEffectiveTeam: (playerId: number) => "wolf" | "village";
  wolvesSkipNextNight: boolean;
}

export function NightStepWolves({
  alive,
  nightVictim,
  setNightVictim,
  advanceNightStep,
  getEffectiveTeam,
  wolvesSkipNextNight,
}: NightStepWolvesProps) {
  const filteredCandidates = alive.filter(player => getEffectiveTeam(player.id) !== "wolf");

  if (wolvesSkipNextNight) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-400">Wen fressen die Werwölfe?</p>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-sm text-gray-300">
          Die Werwölfe sind geschwächt und wählen diese Nacht kein Opfer.
        </div>
        <Btn
          onClick={() => advanceNightStep()}
          cls="bg-red-600 hover:bg-red-500 text-white w-full"
          size="lg"
        >
          Weiter: keine gültigen Opfer
        </Btn>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400">Wen fressen die Werwölfe?</p>
      <div className="space-y-2">
        {filteredCandidates.map(p => (
          <PlayerChip
            key={p.id}
            p={p}
            selected={nightVictim === p.id}
            onClick={() => setNightVictim(p.id)}
          />
        ))}
      </div>
      {filteredCandidates.length === 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-sm text-gray-300">
          Keine gültigen Opfer verfügbar.
        </div>
      )}
      <Btn
        onClick={() => advanceNightStep()}
        cls="bg-red-600 hover:bg-red-500 text-white w-full"
        size="lg"
        disabled={filteredCandidates.length > 0 && nightVictim == null}
      >
        {filteredCandidates.length === 0 ? "Weiter: keine gültigen Opfer" : "Opfer bestätigen →"}
      </Btn>
    </div>
  );
}
