import type { Dispatch, SetStateAction } from "react";
import { PlayerChip } from "../ui/PlayerChip";
import { Btn } from "../ui/Btn";
import type { Player } from "../../types";

interface NightStepWitchProps {
  alive: Player[];
  players: Player[];
  nightVictim: number | null;
  canHealWolfVictim: boolean;
  canPoisonWolfVictim: boolean;
  urwolfTransform: boolean | null;
  witchHealUsed: boolean;
  witchPoisonUsed: boolean;
  witchHealThisRound: boolean;
  setWitchHealThisRound: (v: boolean) => void;
  witchPoisonTarget: number | null;
  setWitchPoisonTarget: Dispatch<SetStateAction<number | null>>;
  advanceNightStep: () => void;
}

export function NightStepWitch({
  alive,
  players,
  nightVictim,
  canHealWolfVictim,
  canPoisonWolfVictim,
  urwolfTransform,
  witchHealUsed,
  witchPoisonUsed,
  witchHealThisRound,
  setWitchHealThisRound,
  witchPoisonTarget,
  setWitchPoisonTarget,
  advanceNightStep,
}: NightStepWitchProps) {
  return (
    <div className="space-y-4">
      {!witchHealUsed && nightVictim != null && !urwolfTransform && canHealWolfVictim && (
        <div className="bg-green-900/30 border border-green-700 rounded-xl p-4">
          <p className="font-semibold mb-2">💚 Heiltrank</p>
          <p className="text-sm text-gray-400 mb-3">
            {players.find(p => p.id === nightVictim)?.name ?? "Unbekannt"} wurde angegriffen.
          </p>
          <Btn
            onClick={() => setWitchHealThisRound(!witchHealThisRound)}
            cls={`w-full ${witchHealThisRound ? "bg-green-600" : "bg-gray-700 hover:bg-gray-600"} text-white`}
          >
            {witchHealThisRound ? "✓ Heiltrank eingesetzt" : "💚 Heilen"}
          </Btn>
        </div>
      )}
      {!witchPoisonUsed && (
        <div className="bg-purple-900/30 border border-purple-700 rounded-xl p-4">
          <p className="font-semibold mb-2">☠️ Gifttrank</p>
          <p className="text-sm text-gray-400 mb-3">Einen Spieler vergiften?</p>
          <div className="space-y-2">
            {alive.filter(p => p.role !== "hexe" && (canPoisonWolfVictim || p.id !== nightVictim)).map(p => (
              <PlayerChip
                key={p.id}
                p={p}
                selected={witchPoisonTarget === p.id}
                onClick={() => setWitchPoisonTarget(witchPoisonTarget === p.id ? null : p.id)}
              />
            ))}
          </div>
        </div>
      )}
      <Btn onClick={advanceNightStep} cls="bg-purple-600 hover:bg-purple-500 text-white w-full" size="lg">
        Weiter →
      </Btn>
    </div>
  );
}
