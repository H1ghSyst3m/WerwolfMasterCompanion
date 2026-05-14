import { getRoleDisplay } from "../domain/roleDisplay";
import { Btn } from "./ui/Btn";
import type { Player, LogEntry, WinReason } from "../types";

const WIN_DATA: Record<WinReason, { icon: string; title: string; color: string; bg: string }> = {
  village: { icon: "🏘️", title: "Das Dorf gewinnt!", color: "text-green-400", bg: "from-green-900/30" },
  wolves:  { icon: "🐺", title: "Die Werwölfe gewinnen!", color: "text-red-400", bg: "from-red-900/30" },
  narr:    { icon: "🃏", title: "Sondersieg: Der Narr!", color: "text-amber-400", bg: "from-amber-900/30" },
  dorftrottel: { icon: "🤡", title: "Sondersieg: Der Dorftrottel!", color: "text-amber-400", bg: "from-amber-900/30" },
  lovers:  { icon: "💕", title: "Die Liebenden gewinnen!", color: "text-pink-400", bg: "from-pink-900/30" },
};

interface GameOverProps {
  winner: WinReason;
  round: number;
  players: Player[];
  log: LogEntry[];
  onReset: (keepPlayers: boolean) => void;
  resetLabel?: string;
}

export function GameOver({ winner, round, players, log, onReset, resetLabel = "🔄 Neues Spiel" }: GameOverProps) {
  const w = WIN_DATA[winner];

  return (
    <div className={`h-full overflow-y-auto bg-gradient-to-b ${w.bg} to-gray-950 text-white`}>
      <div className="p-4 max-w-md mx-auto">
        <div className="text-center pt-12 mb-8">
          <div className="text-7xl mb-4">{w.icon}</div>
          <h1 className={`text-3xl font-bold ${w.color}`}>{w.title}</h1>
          <p className="text-gray-400 mt-2">Runden gespielt: {round}</p>
        </div>

        <div className="bg-gray-900/80 rounded-2xl p-4 mb-4 border border-gray-800">
          <h3 className="font-bold mb-3">Spielerübersicht</h3>
          <div className="space-y-2">
            {players.map(p => {
              const display = getRoleDisplay(p);
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between rounded-xl px-4 py-2 ${p.alive ? "bg-gray-800" : "bg-gray-800/50 opacity-60"}`}
                >
                  <span>{p.alive ? "🟢" : "💀"} {p.name} {p.lover != null ? "💕" : ""}</span>
                  <span className="text-sm">{display?.labelWithIcon ?? ""}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gray-900/80 rounded-2xl p-4 mb-6 border border-gray-800">
          <h3 className="font-bold mb-3">📜 Spielprotokoll</h3>
          {log.map((l, i) => (
            <p
              key={i}
              className={`text-sm py-0.5 ${l.text.startsWith("\n") ? "text-gray-400 font-semibold mt-2" : "text-gray-300"}`}
            >
              {l.text}
            </p>
          ))}
        </div>

        <Btn onClick={() => onReset(true)} cls="bg-purple-600 hover:bg-purple-500 text-white w-full" size="lg">
          {resetLabel}
        </Btn>
      </div>
    </div>
  );
}
