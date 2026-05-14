import { DiscussionTimer } from "./DiscussionTimer";
import { VotePanel } from "./VotePanel";
import { Btn } from "../ui/Btn";
import { ROLES } from "../../constants/roles";
import { getRoleDisplay } from "../../domain/roleDisplay";
import type { Player, RevealMode } from "../../types";

interface DayPhaseProps {
  alive: Player[];
  dayVoteDone: boolean;
  voteConfirm: Player | null;
  setVoteConfirm: (p: Player | null) => void;
  triggerQueueLength: number;
  // Timer
  dayTimer: number;
  timerRunning: boolean;
  timerDuration: number;
  setTimerRunning: (v: boolean) => void;
  setDayTimer: (v: number) => void;
  setTimerDuration: (v: number) => void;
  formatTime: (seconds: number) => string;
  // Handlers
  handleDayVote: (pid: number) => void;
  startNight: () => void;
  // Reveal
  revealMode: RevealMode;
  dayVoteVictim: Player | null;
}

export function DayPhase({
  alive,
  dayVoteDone,
  voteConfirm,
  setVoteConfirm,
  triggerQueueLength,
  dayTimer,
  timerRunning,
  timerDuration,
  setTimerRunning,
  setDayTimer,
  setTimerDuration,
  formatTime,
  handleDayVote,
  startNight,
  revealMode,
  dayVoteVictim,
}: DayPhaseProps) {
  const victimRole = dayVoteVictim?.role ? ROLES[dayVoteVictim.role] : null;
  const victimRoleDisplay = dayVoteVictim ? getRoleDisplay(dayVoteVictim) : null;

  return (
    <div className="space-y-4">
      {!dayVoteDone ? (
        <>
          <DiscussionTimer
            dayTimer={dayTimer}
            timerRunning={timerRunning}
            timerDuration={timerDuration}
            setTimerRunning={setTimerRunning}
            setDayTimer={setDayTimer}
            setTimerDuration={setTimerDuration}
            formatTime={formatTime}
          />
          <VotePanel
            alive={alive}
            voteConfirm={voteConfirm}
            setVoteConfirm={setVoteConfirm}
            handleDayVote={handleDayVote}
            startNight={startNight}
          />
        </>
      ) : triggerQueueLength > 0 ? null : (
        <div className="space-y-4">
          <div className="bg-gray-900/80 rounded-2xl p-6 border border-gray-800 text-center">
            <div className="text-5xl mb-3">🗳️</div>
            <h2 className="text-2xl font-bold mb-2">Hinrichtung vollzogen</h2>
            <p className="text-gray-400">Das Dorf hat gesprochen.</p>
          </div>
          {revealMode !== "hidden" && dayVoteVictim && (
            <div className="bg-gray-900/80 rounded-2xl p-6 border border-gray-700 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                {dayVoteVictim.name} war:
              </p>
              {revealMode === "role" && victimRole && victimRoleDisplay ? (
                <>
                  <div className="text-5xl mb-3">{victimRoleDisplay.icon}</div>
                  <p className="text-xl font-bold">{victimRoleDisplay.label}</p>
                  <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                    victimRole.team === "wolf" ? "bg-red-900/50 text-red-400" : "bg-green-900/50 text-green-400"
                  }`}>
                    {victimRole.team === "wolf" ? "🐺 Böse" : "🏘️ Gut"}
                  </span>
                </>
              ) : victimRole ? (
                <div className={`text-3xl font-bold ${
                  victimRole.team === "wolf" ? "text-red-400" : "text-green-400"
                }`}>
                  {victimRole.team === "wolf" ? "🐺 Böse" : "🏘️ Gut"}
                </div>
              ) : null}
            </div>
          )}
          <Btn onClick={startNight} cls="bg-indigo-600 hover:bg-indigo-500 text-white w-full" size="lg">
            🌙 Nacht einleiten
          </Btn>
        </div>
      )}
    </div>
  );
}
