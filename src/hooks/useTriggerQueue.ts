import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Trigger } from "../types";

export interface TriggerQueueHook {
  triggerQueue: Trigger[];
  setTriggerQueue: Dispatch<SetStateAction<Trigger[]>>;
  currentTrigger: Trigger | null;
}

export function useTriggerQueue(): TriggerQueueHook {
  const [triggerQueue, setTriggerQueue] = useState<Trigger[]>([]);
  const currentTrigger = triggerQueue[0] ?? null;

  return { triggerQueue, setTriggerQueue, currentTrigger };
}
