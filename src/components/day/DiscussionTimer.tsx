import { Btn } from "../ui/Btn";

interface DiscussionTimerProps {
  dayTimer: number;
  timerRunning: boolean;
  timerDuration: number;
  setTimerRunning: (v: boolean) => void;
  setDayTimer: (v: number) => void;
  setTimerDuration: (v: number) => void;
  formatTime: (seconds: number) => string;
}

export function DiscussionTimer({
  dayTimer,
  timerRunning,
  timerDuration,
  setTimerRunning,
  setDayTimer,
  setTimerDuration,
  formatTime,
}: DiscussionTimerProps) {
  return (
    <div className="bg-gray-900/80 rounded-2xl p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">⏱️ Diskussion</h3>
        <span className={`text-2xl font-mono font-bold ${dayTimer < 30 ? "text-red-400" : "text-white"}`}>
          {formatTime(dayTimer)}
        </span>
      </div>
      <div className="flex gap-2">
        <Btn
          onClick={() => setTimerRunning(!timerRunning)}
          cls={`flex-1 ${timerRunning ? "bg-red-600" : "bg-green-600"} text-white`}
          size="sm"
        >
          {timerRunning ? "⏸ Pause" : "▶ Start"}
        </Btn>
        <Btn
          aria-label="Timer zurücksetzen"
          onClick={() => { setDayTimer(timerDuration); setTimerRunning(false); }}
          cls="bg-gray-700 text-white"
          size="sm"
        >
          ↻
        </Btn>
        <select
          aria-label="Timer-Dauer"
          value={timerDuration}
          onChange={e => {
            const v = Number(e.target.value);
            setTimerDuration(v);
            if (!timerRunning) setDayTimer(v);
          }}
          className="bg-gray-700 rounded-lg px-2 text-sm text-white border-0"
        >
          <option value={120}>2 min</option>
          <option value={180}>3 min</option>
          <option value={300}>5 min</option>
          <option value={420}>7 min</option>
          <option value={600}>10 min</option>
        </select>
      </div>
    </div>
  );
}
