import { getRoleDisplay } from "../domain/roleDisplay";
import { Btn } from "./ui/Btn";
import type { Player } from "../types";

interface NightReportProps {
  dayDeaths: Player[];
  startDay: () => void;
}

export function NightReport({ dayDeaths, startDay }: NightReportProps) {
  return (
    <div className="space-y-4">
      <div className="bg-gray-900/80 rounded-2xl p-6 border border-gray-800 text-center">
        <div className="text-5xl mb-3">🌅</div>
        <h2 className="text-2xl font-bold mb-4">Nachtbericht</h2>
        {dayDeaths.length === 0 ? (
          <p className="text-green-400 text-lg">Niemand ist gestorben!</p>
        ) : (
          <div className="space-y-2">
            {dayDeaths.map(p => {
              const display = getRoleDisplay(p);
              return (
                <div key={p.id} className="bg-red-900/30 border border-red-700 rounded-xl p-3">
                  <span className="text-lg">💀 <strong>{p.name}</strong></span>
                  {display && <span className="text-sm text-gray-400 ml-2">({display.label})</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Btn onClick={startDay} cls="bg-amber-600 hover:bg-amber-500 text-white w-full" size="lg">
        ☀️ Tag beginnen
      </Btn>
    </div>
  );
}
