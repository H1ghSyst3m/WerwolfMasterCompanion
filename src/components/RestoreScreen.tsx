import { Btn } from "./ui/Btn";
import type { SaveState } from "../types";
import logoUrl from '/public/favicon.svg?url';

interface RestoreScreenProps {
  pendingRestore: SaveState;
  onRestore: () => void;
  onDiscard: () => void;
}

export function RestoreScreen({ pendingRestore, onRestore, onDiscard }: RestoreScreenProps) {
  const alivePlayers = pendingRestore.players?.filter(p => p.alive).length ?? 0;
  const totalPlayers = pendingRestore.players?.length ?? 0;

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white flex items-center justify-center">
      <div className="w-full max-w-md mx-auto p-4 space-y-4">
        <div className="text-center mb-2">
          <div className="text-5xl mb-3">
            <img src={logoUrl} alt="Werwolf Master Companion" className="w-24 h-24 rounded-2xl mx-auto" />
          </div>
          <h1 className="text-2xl font-bold">Werwolf Master Companion</h1>
        </div>
        <div className="bg-amber-900/30 border border-amber-600 rounded-2xl p-5 text-center">
          <h2 className="text-lg font-bold mb-2">💾 Spielstand gefunden!</h2>
          <p className="text-gray-300 text-sm mb-1">
            {pendingRestore.phase === "ended"
              ? "🏁 Spiel beendet"
              : `Runde ${pendingRestore.round}, ${pendingRestore.gamePhase === "night" ? "🌙 Nacht" : "☀️ Tag"}`}
          </p>
          <p className="text-gray-400 text-sm">
            {alivePlayers} von {totalPlayers} Spielern am Leben
          </p>
        </div>
        <Btn onClick={onRestore} cls="bg-green-600 hover:bg-green-500 text-white w-full" size="lg">
          ✅ Spiel fortsetzen
        </Btn>
        <Btn onClick={onDiscard} cls="bg-gray-700 hover:bg-gray-600 text-white w-full" size="lg">
          🗑️ Verwerfen & neues Spiel
        </Btn>
      </div>
    </div>
  );
}
