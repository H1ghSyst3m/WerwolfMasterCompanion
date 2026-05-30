import type { ReactNode } from "react";
import { Btn } from "../ui/Btn";
import { SetupScreenShell } from "./SetupScreenShell";
import type { Player } from "../../types";

interface SetupStep1Props {
  players: Player[];
  nameInput: string;
  setNameInput: (v: string) => void;
  addPlayer: () => void;
  removePlayer: (id: number) => void;
  onNext: () => void;
  clearPlayers?: () => void;
  headerAction?: ReactNode;
}

export function SetupStep1({
  players,
  nameInput,
  setNameInput,
  addPlayer,
  removePlayer,
  onNext,
  clearPlayers,
  headerAction,
}: SetupStep1Props) {
  return (
    <SetupScreenShell
      step={1}
      title="Spieler hinzufügen"
      headerAction={headerAction}
      footer={
        <>
          <Btn
            onClick={onNext}
            cls="bg-purple-600 hover:bg-purple-500 text-white w-full"
            size="lg"
            disabled={players.length < 5}
          >
            Weiter: Rollen wählen →
          </Btn>
          {players.length > 0 && players.length < 5 && (
            <p className="text-amber-400 text-sm text-center">Min. 5 Spieler benötigt</p>
          )}
        </>
      }
    >
      <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
        <div className="flex gap-2 mb-4">
          <label htmlFor="setup-player-name" className="sr-only">Spielername</label>
          <input
            id="setup-player-name"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && nameInput.trim()) addPlayer(); }}
            placeholder="Name eingeben..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <Btn onClick={addPlayer} cls="bg-purple-600 hover:bg-purple-500 text-white" disabled={!nameInput.trim()} aria-label="Spieler hinzufügen">+</Btn>
        </div>
        <div className="space-y-2">
          {players.map(p => (
            <div key={p.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
              <span>{p.name}</span>
              <button onClick={() => removePlayer(p.id)} aria-label={`Spieler ${p.name} entfernen`} className="text-red-400 hover:text-red-300 text-xl leading-none">×</button>
            </div>
          ))}
        </div>
        {players.length > 0 && (
          <div className="flex items-center justify-between mt-2">
            <p className="text-gray-400 text-sm">{players.length} Spieler</p>
            {clearPlayers && (
              <Btn onClick={clearPlayers} cls="text-red-400 hover:text-red-300 bg-gray-800 hover:bg-gray-700" size="sm">
                🗑️ Liste leeren
              </Btn>
            )}
          </div>
        )}
      </div>
    </SetupScreenShell>
  );
}
