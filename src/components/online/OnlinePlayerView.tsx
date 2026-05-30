import { useEffect, useState } from "react";
import { RoleRevealScreen } from "../setup/RoleRevealScreen";
import { Btn } from "../ui/Btn";
import { ConfirmModal } from "../ui/ConfirmModal";
import { RulesButton } from "../ui/RulesButton";
import type { OnlinePlayerSnapshot } from "../../online/messages";
import type { RoleId } from "../../types";

interface OnlinePlayerViewProps {
  snapshot: OnlinePlayerSnapshot;
  onRevealDone: () => void;
  onLeave: () => void;
}

export function OnlinePlayerView({ snapshot, onRevealDone, onLeave }: OnlinePlayerViewProps) {
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [roleCardContext, setRoleCardContext] = useState<{ playerId: number; role: RoleId } | null>(null);
  const player = snapshot.player;
  const canLeave = snapshot.roomPhase === "lobby" || snapshot.roomPhase === "ended" || player?.alive === false;
  const canOpenRole = Boolean(player?.role);
  const roleCardOpen = Boolean(
    roleCardContext &&
    player?.role &&
    roleCardContext.playerId === player.id &&
    roleCardContext.role === player.role,
  );

  useEffect(() => {
    const timerId = window.setTimeout(() => setRoleCardContext(null), 0);
    return () => window.clearTimeout(timerId);
  }, [player?.id, player?.role]);

  if (snapshot.roomPhase === "roleReveal" && player?.role && !snapshot.roleRevealed) {
    return (
      <RoleRevealScreen
        players={[player]}
        onDone={onRevealDone}
        doneLabel="Fertig"
        showRoleInfo
        showRoleInfoIdentity={false}
      />
    );
  }

  if (roleCardOpen && player?.role) {
    return (
      <RoleRevealScreen
        players={[player]}
        onDone={() => setRoleCardContext(null)}
        title="Deine Rolle"
        instructionText="Nur für dich sichtbar öffnen."
        doneLabel="Schließen"
        showRoleInfo
        showRoleInfoIdentity={false}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-indigo-950 to-gray-950 text-white">
      <div className="min-h-full max-w-md mx-auto px-4 py-6 flex flex-col">
        <header className="flex justify-end gap-2 mb-4">
          <RulesButton label="📖" cls="h-10" />
          {canOpenRole && (
            <button
              onClick={() => {
                if (player?.role) setRoleCardContext({ playerId: player.id, role: player.role });
              }}
              className="w-10 h-10 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700"
              aria-label="Eigene Rolle anzeigen"
            >
              🃏
            </button>
          )}
        </header>

        <div className="text-center mb-6">
          <div className="text-6xl mb-3">🐺</div>
          <h1 className="text-2xl font-bold">{player?.name ?? "Spieler"}</h1>
          <p className="text-gray-400 text-sm mt-1">Raum {snapshot.roomCode}</p>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-4">
          <h2 className="font-bold mb-3">Spieler</h2>
          <div className="space-y-2">
            {snapshot.players.map(lobbyPlayer => (
              <div key={lobbyPlayer.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                <span>{lobbyPlayer.connected ? "🟢" : "⚫"} {lobbyPlayer.name}</span>
                {snapshot.roomPhase === "roleReveal" && (
                  <span className="text-xs text-gray-500">{lobbyPlayer.roleRevealed ? "bereit" : "Rolle"}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 text-center">
          <p className="font-semibold mb-1">
            {snapshot.roomPhase === "lobby"
              ? "Warte in der Lobby"
              : canOpenRole
                ? "Du bist im Spiel"
                : "Warte auf die Spielleitung"}
          </p>
          <p className="text-gray-400 text-sm">
            {canOpenRole ? "Deine Rolle und Beschreibung sind über die private Karte sichtbar." : "Die nächste Ansicht erscheint automatisch."}
          </p>
        </div>

        {snapshot.roomPhase === "ended" && snapshot.winner && (
          <div className="mt-4 bg-purple-900/40 border border-purple-600 rounded-xl p-4 text-center">
            <p className="font-semibold">Das Spiel ist beendet.</p>
            <p className="text-sm text-purple-200 mt-1">Die Spielleitung kann euch zurück in die Lobby bringen.</p>
          </div>
        )}

        {snapshot.roomPhase === "roleReveal" && snapshot.roleRevealed && (
          <Btn cls="bg-gray-800 text-gray-400 w-full mt-4" disabled>
            Rolle angesehen · Warte auf die erste Nacht
          </Btn>
        )}

        <div className="mt-auto pt-6">
          <Btn onClick={() => setLeaveOpen(true)} cls="bg-gray-900 hover:bg-gray-800 text-gray-300 w-full border border-gray-800" size="sm">
            Raum wechseln
          </Btn>
        </div>
      </div>

      {leaveOpen && (
        <ConfirmModal
          title="Raum wechseln?"
          description={
            canLeave
              ? "Du verlässt diesen Raum auf diesem Gerät. In der Lobby wirst du aus der Liste entfernt."
              : "Während du im laufenden Spiel lebst, kannst du den Raum nicht wechseln."
          }
          cancelLabel="Abbrechen"
          confirmLabel="Wechseln"
          onCancel={() => setLeaveOpen(false)}
          onConfirm={() => {
            onLeave();
            setLeaveOpen(false);
          }}
          confirmDisabled={!canLeave}
        />
      )}

    </div>
  );
}
