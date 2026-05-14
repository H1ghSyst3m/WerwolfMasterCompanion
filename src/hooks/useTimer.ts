import { useState, useEffect, useRef } from "react";
import type { RefObject, Dispatch, SetStateAction } from "react";

export interface TimerHook {
  dayTimer: number;
  setDayTimer: Dispatch<SetStateAction<number>>;
  timerRunning: boolean;
  setTimerRunning: Dispatch<SetStateAction<boolean>>;
  timerDuration: number;
  setTimerDuration: Dispatch<SetStateAction<number>>;
  /** Ref that always holds the latest timer value (used for save/restore) */
  dayTimerRef: RefObject<number>;
  formatTime: (seconds: number) => string;
}

export function useTimer(): TimerHook {
  const [dayTimer, setDayTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerDuration, setTimerDuration] = useState(300);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dayTimerRef = useRef(0);

  // Keep dayTimerRef in sync for use in save/restore
  useEffect(() => {
    dayTimerRef.current = dayTimer;
  }, [dayTimer]);

  // Countdown tick
  useEffect(() => {
    if (timerRunning && dayTimer > 0) {
      timerRef.current = setTimeout(() => setDayTimer(t => t - 1), 1000);
      return () => {
        if (timerRef.current !== null) clearTimeout(timerRef.current);
      };
    } else if (dayTimer === 0 && timerRunning) {
      // Defer to avoid setState-in-effect lint warning while preserving behaviour
      const id = setTimeout(() => setTimerRunning(false), 0);
      return () => clearTimeout(id);
    }
  }, [timerRunning, dayTimer]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return {
    dayTimer, setDayTimer,
    timerRunning, setTimerRunning,
    timerDuration, setTimerDuration,
    dayTimerRef,
    formatTime,
  };
}
