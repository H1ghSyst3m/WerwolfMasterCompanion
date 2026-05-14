import type { Dispatch, SetStateAction } from "react";
import { PlayerChip } from "../ui/PlayerChip";
import { Btn } from "../ui/Btn";
import type { Player } from "../../types";

interface NightStepAmorProps {
  alive: Player[];
  players: Player[];
  amorPick: number[];
  setAmorPick: Dispatch<SetStateAction<number[]>>;
  setPlayers: Dispatch<SetStateAction<Player[]>>;
  addLog: (text: string) => void;
  advanceNightStep: () => void;
}

export function NightStepAmor({
  alive,
  players,
  amorPick,
  setAmorPick,
  setPlayers,
  addLog,
  advanceNightStep,
}: NightStepAmorProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400">Wähle 2 Spieler als Liebespaar:</p>
      <div className="space-y-2">
        {alive.filter(p => p.role !== "amor").map(p => (
          <PlayerChip
            key={p.id}
            p={p}
            selected={amorPick.includes(p.id)}
            onClick={() =>
              setAmorPick(prev =>
                prev.includes(p.id)
                  ? prev.filter(x => x !== p.id)
                  : prev.length < 2
                    ? [...prev, p.id]
                    : [prev[0], p.id],
              )
            }
          />
        ))}
      </div>
      <Btn
        onClick={() => {
          const [a, b] = amorPick;
          setPlayers(prev =>
            prev.map(p => p.id === a ? { ...p, lover: b } : p.id === b ? { ...p, lover: a } : p),
          );
          addLog(
            `💘 Amor verbindet ${players.find(p => p.id === a)?.name ?? "Unbekannt"} und ${players.find(p => p.id === b)?.name ?? "Unbekannt"}.`,
          );
          advanceNightStep();
        }}
        cls="bg-pink-600 hover:bg-pink-500 text-white w-full"
        size="lg"
        disabled={amorPick.length !== 2}
      >
        💕 Liebespaar bestätigen
      </Btn>
    </div>
  );
}
