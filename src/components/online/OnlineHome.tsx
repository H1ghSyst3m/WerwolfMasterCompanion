import { useMemo, useState } from "react";
import { Btn } from "../ui/Btn";
import { RulesButton } from "../ui/RulesButton";
import type { OnlineRoomHook } from "../../online/useOnlineRoom";

interface OnlineHomeProps {
  online: OnlineRoomHook;
  initialRoomCode?: string;
  onBack: () => void;
}

export function OnlineHome({ online, initialRoomCode = "", onBack }: OnlineHomeProps) {
  const [roomCode, setRoomCode] = useState(online.transferredRoomCode ?? initialRoomCode);
  const [name, setName] = useState("");

  const statusText = useMemo(() => {
    if (online.status === "open") return "Verbunden";
    if (online.status === "reconnecting") return "Verbinde erneut...";
    if (online.status === "connecting") return "Verbinde...";
    return "Nicht verbunden";
  }, [online.status]);

  const joinCode = (online.transferredRoomCode ?? roomCode).trim().toUpperCase();
  const trimmedName = name.trim();
  const canJoin = joinCode.length > 0 && trimmedName.length > 0;
  const canRetryConnection = online.status !== "open" || online.error !== null;

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-indigo-950 to-gray-950 text-white">
      <div className="min-h-full max-w-md mx-auto px-4 py-6 flex flex-col">
        <header className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="text-gray-400 hover:text-white px-2 py-1">← Zurück</button>
          <div className="flex items-center gap-2">
            <RulesButton />
            <span className={`text-xs px-2 py-1 rounded-full ${online.status === "open" ? "bg-green-900/50 text-green-300" : "bg-gray-800 text-gray-400"}`}>
              {statusText}
            </span>
          </div>
        </header>

        <div className="text-center mb-6">
          <div className="text-6xl mb-3">🌐</div>
          <h1 className="text-2xl font-bold">Online-Modus</h1>
          <p className="text-gray-400 text-sm mt-2">Spielleitung erstellt einen Raum, Spieler treten per Code bei.</p>
        </div>

        {online.wasHostTransferred && (
          <div className="bg-purple-900/40 border border-purple-600 rounded-xl p-4 mb-4">
            <p className="font-semibold">Spielleitung übertragen</p>
            <p className="text-sm text-purple-200 mt-1">Gib deinen Spielernamen ein, um diesem Raum als Spieler beizutreten.</p>
          </div>
        )}

        {online.notice && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-200">{online.notice}</p>
          </div>
        )}

        {canRetryConnection && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 mb-4">
            {online.error && <p className="text-sm text-red-200 mb-3">{online.error}</p>}
            {!online.error && <p className="text-sm text-gray-300 mb-3">Keine aktive Verbindung zum Online-Server.</p>}
            <Btn onClick={online.reconnect} cls="bg-gray-800 hover:bg-gray-700 text-white w-full">
              Verbindung erneut versuchen
            </Btn>
          </div>
        )}

        {online.storedSession && !online.wasHostTransferred && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-4">
            <p className="font-semibold mb-1">Letzten Raum fortsetzen</p>
            <p className="text-sm text-gray-400 mb-3">
              Raum {online.storedSession.roomCode} als {online.storedSession.role === "gm" ? "Spielleitung" : "Spieler"}
            </p>
            <div className="flex gap-2">
              <Btn onClick={online.resumeStoredSession} cls="bg-purple-600 hover:bg-purple-500 text-white flex-1" disabled={online.status !== "open"}>
                Fortsetzen
              </Btn>
              <Btn onClick={online.clearSession} cls="bg-gray-800 hover:bg-gray-700 text-white">
                Vergessen
              </Btn>
            </div>
          </div>
        )}

        {!online.wasHostTransferred && (
          <Btn onClick={online.createRoom} cls="bg-purple-600 hover:bg-purple-500 text-white w-full mb-4" size="lg" disabled={online.status !== "open"}>
            Raum erstellen
          </Btn>
        )}

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <h2 className="font-bold mb-3">Raum beitreten</h2>
          {!online.transferredRoomCode && (
            <label className="block mb-3">
              <span className="text-xs text-gray-400">Raumcode</span>
              <input
                value={roomCode}
                onChange={event => setRoomCode(event.target.value.toUpperCase())}
                placeholder="ABC123"
                className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 uppercase"
              />
            </label>
          )}
          {online.transferredRoomCode && (
            <p className="text-sm text-gray-400 mb-3">Raumcode: <span className="text-white font-bold">{online.transferredRoomCode}</span></p>
          )}
          <label className="block mb-4">
            <span className="text-xs text-gray-400">Spielername</span>
            <input
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="Name eingeben..."
              className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </label>
          <Btn
            onClick={() => online.joinRoom(joinCode, trimmedName)}
            cls="bg-gray-700 hover:bg-gray-600 text-white w-full"
            size="lg"
            disabled={!canJoin || online.status !== "open"}
          >
            Beitreten
          </Btn>
        </div>
      </div>
    </div>
  );
}
