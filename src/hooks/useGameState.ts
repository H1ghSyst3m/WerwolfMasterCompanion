import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { getTeam } from "../logic/gameLogic";
import type { Player, GamePhase, AppPhase, LogEntry, WinReason, RoleId } from "../types";

export interface GameStateHook {
  phase: AppPhase;
  setPhase: Dispatch<SetStateAction<AppPhase>>;
  setupStep: number;
  setSetupStep: Dispatch<SetStateAction<number>>;
  players: Player[];
  setPlayers: Dispatch<SetStateAction<Player[]>>;
  round: number;
  setRound: Dispatch<SetStateAction<number>>;
  gamePhase: GamePhase;
  setGamePhase: Dispatch<SetStateAction<GamePhase>>;
  log: LogEntry[];
  setLog: Dispatch<SetStateAction<LogEntry[]>>;
  winner: WinReason | null;
  setWinner: Dispatch<SetStateAction<WinReason | null>>;
  dayDeaths: Player[];
  setDayDeaths: Dispatch<SetStateAction<Player[]>>;
  dayVoteDone: boolean;
  setDayVoteDone: Dispatch<SetStateAction<boolean>>;
  voteConfirm: Player | null;
  setVoteConfirm: Dispatch<SetStateAction<Player | null>>;
  // Derived
  alive: Player[];
  wolvesAlive: Player[];
  villageAlive: Player[];
  hasRole: (r: RoleId) => boolean;
  hadRole: (r: RoleId) => boolean;
  aliveWithRole: (r: RoleId) => boolean;
  addLog: (text: string, r?: number, gp?: GamePhase) => void;
}

export function useGameState(): GameStateHook {
  const [phase, setPhase] = useState<AppPhase>("setup");
  const [setupStep, setSetupStep] = useState(1);
  const [players, setPlayers] = useState<Player[]>([]);
  const [round, setRound] = useState(1);
  const [gamePhase, setGamePhase] = useState<GamePhase>("night");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [winner, setWinner] = useState<WinReason | null>(null);
  const [dayDeaths, setDayDeaths] = useState<Player[]>([]);
  const [dayVoteDone, setDayVoteDone] = useState(false);
  const [voteConfirm, setVoteConfirm] = useState<Player | null>(null);

  const alive = useMemo(() => players.filter(p => p.alive), [players]);
  const hasRole = useCallback((r: RoleId) => players.some(p => p.role === r), [players]);
  const hadRole = useCallback((r: RoleId) => players.some(p => p.originalRole === r), [players]);
  const aliveWithRole = useCallback((r: RoleId) => players.some(p => p.alive && p.role === r), [players]);
  const wolvesAlive = useMemo(
    () => alive.filter(p => getTeam(p.role) === "wolf"),
    [alive],
  );
  const villageAlive = useMemo(
    () => alive.filter(p => getTeam(p.role) !== "wolf"),
    [alive],
  );

  // Refs so that addLog always reads the latest round/gamePhase even if the
  // callback was captured before the state update was committed.
  const roundRef = useRef(round);
  const gamePhaseRef = useRef<GamePhase>(gamePhase);
  useEffect(() => {
    roundRef.current = round;
    gamePhaseRef.current = gamePhase;
  }, [round, gamePhase]);

  const addLog = useCallback(
    (text: string, r?: number, gp?: GamePhase) => {
      setLog(prev => [
        ...prev,
        { round: r ?? roundRef.current, phase: gp ?? gamePhaseRef.current, text, time: Date.now() },
      ]);
    },
    [],
  );

  return {
    phase, setPhase,
    setupStep, setSetupStep,
    players, setPlayers,
    round, setRound,
    gamePhase, setGamePhase,
    log, setLog,
    winner, setWinner,
    dayDeaths, setDayDeaths,
    dayVoteDone, setDayVoteDone,
    voteConfirm, setVoteConfirm,
    alive, wolvesAlive, villageAlive,
    hasRole, hadRole, aliveWithRole, addLog,
  };
}
