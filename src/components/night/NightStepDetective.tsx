import type { Dispatch, SetStateAction } from "react";
import { PlayerChip } from "../ui/PlayerChip";
import { Btn } from "../ui/Btn";
import type { Player } from "../../types";

interface NightStepDetectiveProps {
  alive: Player[];
  players: Player[];
  detectivePicks: number[];
  setDetectivePicks: Dispatch<SetStateAction<number[]>>;
  detectiveRevealed: boolean;
  setDetectiveRevealed: (v: boolean) => void;
  getEffectiveTeam: (playerId: number) => "wolf" | "village";
  addLog: (text: string) => void;
  advanceNightStep: () => void;
}

export function NightStepDetective({
  alive,
  players,
  detectivePicks,
  setDetectivePicks,
  detectiveRevealed,
  setDetectiveRevealed,
  getEffectiveTeam,
  addLog,
  advanceNightStep,
}: NightStepDetectiveProps) {
  const p1 = detectivePicks[0] != null ? players.find(p => p.id === detectivePicks[0]) : null;
  const p2 = detectivePicks[1] != null ? players.find(p => p.id === detectivePicks[1]) : null;
  const sameTeam = p1 && p2 ? getEffectiveTeam(p1.id) === getEffectiveTeam(p2.id) : null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400">Wähle zwei Spieler zum Vergleichen:</p>
      <div className="space-y-2">
        {alive.filter(p => p.role !== "detektiv").map(p => (
          <PlayerChip
            key={p.id}
            p={p}
            selected={detectivePicks.includes(p.id)}
            onClick={() => {
              setDetectiveRevealed(false);
              setDetectivePicks(prev =>
                prev.includes(p.id)
                  ? prev.filter(x => x !== p.id)
                  : prev.length < 2
                    ? [...prev, p.id]
                    : [prev[0], p.id],
              );
            }}
            extra={
              detectivePicks.includes(p.id)
                ? <span className="text-purple-400 text-xs font-bold">#{detectivePicks.indexOf(p.id) + 1}</span>
                : null
            }
          />
        ))}
      </div>
      {detectivePicks.length === 2 && !detectiveRevealed && (
        <Btn onClick={() => setDetectiveRevealed(true)} cls="bg-blue-600 hover:bg-blue-500 text-white w-full" size="lg">
          🔍 Ergebnis aufdecken
        </Btn>
      )}
      {detectiveRevealed && sameTeam !== null && (
        <div className={`border rounded-xl p-4 text-center ${sameTeam ? "bg-green-900/40 border-green-600" : "bg-red-900/40 border-red-600"}`}>
          <p className="font-bold text-lg mb-1">{p1?.name} & {p2?.name}</p>
          <p className={`text-xl font-bold ${sameTeam ? "text-green-400" : "text-red-400"}`}>
            {sameTeam ? "✅ Gleiches Team" : "❌ Verschiedene Teams"}
          </p>
        </div>
      )}
      <Btn
        onClick={() => {
          const name1 = p1?.name ?? "Unbekannt";
          const name2 = p2?.name ?? "Unbekannt";
          addLog(`🔍 Detektiv vergleicht ${name1} & ${name2}: ${sameTeam ? "Gleiches Team" : "Verschiedene Teams"}.`);
          advanceNightStep();
        }}
        cls="bg-indigo-600 hover:bg-indigo-500 text-white w-full"
        size="lg"
        disabled={!detectiveRevealed}
      >
        Weiter →
      </Btn>
    </div>
  );
}
