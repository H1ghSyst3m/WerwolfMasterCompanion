import { Modal } from "./ui/Modal";
import { Btn } from "./ui/Btn";
import type { Player, Trigger } from "../types";

interface HunterTriggerProps {
  currentTrigger: Trigger;
  players: Player[];
  resolveHunter: (targetId: number | null) => void;
}

export function HunterTrigger({ currentTrigger, players, resolveHunter }: HunterTriggerProps) {
  return (
    <Modal>
      <div className="text-center">
        <div className="text-5xl mb-3">🎯</div>
        <h2 className="text-xl font-bold mb-2">Jäger ist gefallen!</h2>
        <p className="text-gray-400 mb-4">{currentTrigger.victim} darf jemanden mitnehmen.</p>
        <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
          {players
            .filter(p => p.alive && p.id !== currentTrigger.victimId)
            .map(p => (
              <Btn
                key={p.id}
                onClick={() => resolveHunter(p.id)}
                cls="bg-red-700 hover:bg-red-600 text-white w-full"
              >
                {p.name} mitnehmen
              </Btn>
            ))}
        </div>
        <Btn onClick={() => resolveHunter(null)} cls="bg-gray-700 text-white w-full">
          Verzichten
        </Btn>
      </div>
    </Modal>
  );
}
