import { useState } from "react";
import { Btn } from "../ui/Btn";
import { ConfirmModal } from "../ui/ConfirmModal";
import { RulesButton } from "../ui/RulesButton";
import { RoomJoinQr } from "./RoomJoinQr";
import type { OnlineGmSnapshot } from "../../online/messages";

interface OnlineLobbyProps {
  snapshot: OnlineGmSnapshot;
  onStartSetup: () => void;
  onCloseRoom: () => void;
  onTransferHost: (playerId: number) => void;
  onKickPlayer: (playerId: number) => void;
}

export function OnlineLobby({ snapshot, onStartSetup, onCloseRoom, onTransferHost, onKickPlayer }: OnlineLobbyProps) {
  const [transferOpen, setTransferOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [kickPlayerId, setKickPlayerId] = useState<number | null>(null);
  const connectedPlayers = snapshot.players.filter(player => player.connected);
  const kickPlayer = kickPlayerId !== null
    ? snapshot.players.find(player => player.id === kickPlayerId) ?? null
    : null;

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-indigo-950 to-gray-950 text-white">
      <div className="min-h-full max-w-md mx-auto px-4 py-6 flex flex-col">
        <div className="flex justify-end mb-4">
          <RulesButton />
        </div>

        <div className="text-center mb-6">
          <p className="text-gray-400 text-sm mb-2">Raumcode</p>
          <div className="text-5xl font-black tracking-widest">{snapshot.roomCode}</div>
          <p className="text-gray-500 text-xs mt-3">Spieler öffnen den Online-Modus und treten mit diesem Code bei.</p>
        </div>

        <RoomJoinQr roomCode={snapshot.roomCode} />

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">Lobby</h2>
            <span className="text-sm text-gray-400">{snapshot.players.length} Spieler</span>
          </div>
          <div className="space-y-2">
            {snapshot.players.map(player => (
              <div key={player.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                <span className="min-w-0 truncate">{player.connected ? "🟢" : "⚫"} {player.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-500">{player.connected ? "online" : "offline"}</span>
                  <button
                    onClick={() => setKickPlayerId(player.id)}
                    className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-red-900/70 text-red-300 text-sm"
                    aria-label={`${player.name} aus der Lobby entfernen`}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            {snapshot.players.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-6">Warte auf Spieler...</p>
            )}
          </div>
        </div>

        <div className="space-y-3 mt-auto">
          <Btn
            onClick={onStartSetup}
            cls="bg-purple-600 hover:bg-purple-500 text-white w-full"
            size="lg"
            disabled={snapshot.players.length < 5}
          >
            Weiter: Rollen wählen →
          </Btn>
          {snapshot.players.length > 0 && snapshot.players.length < 5 && (
            <p className="text-amber-400 text-sm text-center">Min. 5 Spieler benötigt</p>
          )}

          <Btn
            onClick={() => setTransferOpen(open => !open)}
            cls="bg-gray-800 hover:bg-gray-700 text-white w-full"
            disabled={connectedPlayers.length === 0}
          >
            Spielleitung übertragen
          </Btn>

          {transferOpen && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 space-y-2">
              <p className="text-xs text-gray-400 mb-2">Verbundenen Spieler zur neuen Spielleitung machen:</p>
              {connectedPlayers.map(player => (
                <button
                  key={player.id}
                  onClick={() => onTransferHost(player.id)}
                  className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-xl px-4 py-3"
                >
                  🟢 {player.name}
                </button>
              ))}
            </div>
          )}

          <Btn
            onClick={() => setCloseOpen(true)}
            cls="bg-red-950/70 hover:bg-red-900 text-red-100 w-full border border-red-900/70"
          >
            Raum schließen
          </Btn>
        </div>
      </div>

      {closeOpen && (
        <ConfirmModal
          title="Raum schließen?"
          description="Der Raum wird für alle beendet. Verbundene Spieler kehren zum Online-Start zurück. Fortsetzen ist danach nicht mehr möglich."
          cancelLabel="Abbrechen"
          confirmLabel="Schließen"
          onCancel={() => setCloseOpen(false)}
          onConfirm={() => {
            onCloseRoom();
            setCloseOpen(false);
          }}
        />
      )}

      {kickPlayer && (
        <ConfirmModal
          title="Spieler entfernen?"
          description={`${kickPlayer.name} wird aus der Lobby entfernt und der Name wird wieder frei.`}
          cancelLabel="Abbrechen"
          confirmLabel="Entfernen"
          onCancel={() => setKickPlayerId(null)}
          onConfirm={() => {
            onKickPlayer(kickPlayer.id);
            setKickPlayerId(null);
          }}
        />
      )}
    </div>
  );
}
