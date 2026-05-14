import { Btn } from "./ui/Btn";
import type { GameMode } from "../types";

interface ModeSelectionProps {
  onSelectMode: (mode: GameMode) => void;
}

export function ModeSelection({ onSelectMode }: ModeSelectionProps) {
  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-indigo-950 to-gray-950 text-white">
      <div className="min-h-full max-w-md mx-auto px-4 py-10 flex flex-col justify-center">
        <div className="text-center mb-8">
          <div className="text-7xl mb-4">🐺</div>
          <h1 className="text-3xl font-bold">Werwolf Master</h1>
          <p className="text-gray-400 mt-2">Wie wollt ihr spielen?</p>
        </div>

        <div className="space-y-3">
          <Btn onClick={() => onSelectMode("local")} cls="bg-purple-600 hover:bg-purple-500 text-white w-full" size="lg">
            📱 Lokal
          </Btn>
          <Btn onClick={() => onSelectMode("online")} cls="bg-gray-800 hover:bg-gray-700 text-white w-full border border-gray-700" size="lg">
            🌐 Online
          </Btn>
        </div>
      </div>
    </div>
  );
}
