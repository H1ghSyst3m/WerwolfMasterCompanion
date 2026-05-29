import { Btn } from "../ui/Btn";
import type { Player } from "../../types";

interface NightStepUrwolfProps {
  nightVictim: number | null;
  beschuetzerTarget: number | null;
  verfluchterConvertedThisNight: number | null;
  players: Player[];
  setUrwolfTransform: (v: boolean) => void;
  advanceNightStep: (urwolfTransformOverride?: boolean | null) => void;
}

export function NightStepUrwolf({
  nightVictim,
  beschuetzerTarget,
  verfluchterConvertedThisNight,
  players,
  setUrwolfTransform,
  advanceNightStep,
}: NightStepUrwolfProps) {
  if (nightVictim != null) {
    const victim = players.find(p => p.id === nightVictim);
    if (nightVictim === verfluchterConvertedThisNight) {
      return (
        <div className="space-y-3">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-sm mb-1">Aktuelles Werwolf-Opfer:</p>
            <p className="text-xl font-bold">{victim?.name ?? "Unbekannt"}</p>
            <p className="text-sm text-gray-400 mt-3">
              Der Verfluchte wurde bereits durch den Angriff zum Werwolf. Der Urwolf kann dieses Opfer nicht zusätzlich verwandeln.
            </p>
          </div>
          <Btn onClick={() => advanceNightStep()} cls="bg-indigo-600 hover:bg-indigo-500 text-white w-full" size="lg">
            Weiter →
          </Btn>
        </div>
      );
    }

    if (nightVictim === beschuetzerTarget) {
      return (
        <div className="space-y-3">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-sm mb-1">Aktuelles Werwolf-Opfer:</p>
            <p className="text-xl font-bold">{victim?.name ?? "Unbekannt"}</p>
            <p className="text-sm text-gray-400 mt-3">
              Der Beschützer verhindert den Angriff. Der Urwolf kann dieses Opfer nicht verwandeln.
            </p>
          </div>
          <Btn onClick={() => advanceNightStep()} cls="bg-indigo-600 hover:bg-indigo-500 text-white w-full" size="lg">
            Weiter →
          </Btn>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-sm mb-1">Aktuelles Werwolf-Opfer:</p>
          <p className="text-xl font-bold">{victim?.name ?? "Unbekannt"}</p>
        </div>
        <div className="flex gap-2">
          <Btn
            onClick={() => { setUrwolfTransform(false); advanceNightStep(false); }}
            cls="flex-1 bg-gray-700 hover:bg-gray-600 text-white"
            size="lg"
          >
            💀 Normal töten
          </Btn>
          <Btn
            onClick={() => { setUrwolfTransform(true); advanceNightStep(true); }}
            cls="flex-1 bg-red-700 hover:bg-red-600 text-white"
            size="lg"
          >
            🐺 Verwandeln!
          </Btn>
        </div>
        <p className="text-gray-500 text-xs text-center">
          Verwandlung ist einmalig. Das Opfer wird zum Werwolf statt zu sterben.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
      <p className="text-gray-400">Kein Opfer gewählt. Überspringen.</p>
      <Btn onClick={() => advanceNightStep()} cls="bg-indigo-600 hover:bg-indigo-500 text-white w-full mt-3" size="lg">
        Weiter →
      </Btn>
    </div>
  );
}
