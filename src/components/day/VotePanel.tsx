import { ROLES } from "../../constants/roles";
import { Btn } from "../ui/Btn";
import type { Player } from "../../types";

interface VotePanelProps {
  alive: Player[];
  voteConfirm: Player | null;
  setVoteConfirm: (p: Player | null) => void;
  handleDayVote: (pid: number) => void;
  startNight: () => void;
}

export function VotePanel({
  alive,
  voteConfirm,
  setVoteConfirm,
  handleDayVote,
  startNight,
}: VotePanelProps) {
  return (
    <div className="bg-gray-900/80 rounded-2xl p-4 border border-gray-800">
      <h3 className="font-semibold mb-3">🗳️ Abstimmung</h3>
      {voteConfirm ? (
        <div className="space-y-3">
          <div className="bg-amber-900/40 border border-amber-600 rounded-xl p-4 text-center">
            <p className="text-lg font-bold mb-1">⚠️ {voteConfirm.name} eliminieren?</p>
            <p className="text-gray-400 text-sm">Diese Aktion kann nicht rückgängig gemacht werden.</p>
          </div>
          <div className="flex gap-2">
            <Btn onClick={() => setVoteConfirm(null)} cls="flex-1 bg-gray-700 hover:bg-gray-600 text-white" size="lg">
              Abbrechen
            </Btn>
            <Btn
              onClick={() => { const id = voteConfirm.id; setVoteConfirm(null); handleDayVote(id); }}
              cls="flex-1 bg-red-600 hover:bg-red-500 text-white"
              size="lg"
            >
              Eliminieren
            </Btn>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400 mb-3">Tippe auf den Spieler, der eliminiert wird:</p>
          <div className="space-y-2">
            {alive.map(p => (
              <button
                key={p.id}
                onClick={() => setVoteConfirm(p)}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-gray-800 border-2 border-gray-700 hover:border-amber-500 transition-all active:scale-95"
              >
                <span className="text-lg">🟢</span>
                <span className="flex-1 text-left font-medium">{p.name}</span>
                <span className="text-sm opacity-50">{p.role ? ROLES[p.role]?.icon : ""}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <div className="mt-3">
        <Btn onClick={startNight} cls="bg-indigo-600 hover:bg-indigo-500 text-white w-full" size="lg">
          🌙 Nacht einleiten (ohne Abstimmung)
        </Btn>
      </div>
    </div>
  );
}
