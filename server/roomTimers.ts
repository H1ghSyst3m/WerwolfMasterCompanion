import { broadcast } from "./roomSnapshots";
import type { OutgoingMessage, ServerRoom } from "./roomTypes";

export function tickTimers(rooms: Iterable<ServerRoom>, now = Date.now()): OutgoingMessage[] {
  const outgoing: OutgoingMessage[] = [];
  for (const room of rooms) {
    if (!room.timerRunning) continue;
    const elapsed = Math.floor((now - room.lastTimerAt) / 1000);
    if (elapsed <= 0) continue;
    room.lastTimerAt += elapsed * 1000;
    room.dayTimer = Math.max(0, room.dayTimer - elapsed);
    if (room.dayTimer === 0) room.timerRunning = false;
    outgoing.push(...broadcast(room));
  }
  return outgoing;
}

export function setTimer(room: ServerRoom, payload: unknown): void {
  const timer = payload as { dayTimer?: number; timerDuration?: number; timerRunning?: boolean };
  const { dayTimer, timerDuration, timerRunning } = timer;
  const hasTimerRunning = typeof timerRunning === "boolean";
  if (Number.isFinite(timerDuration) && timerDuration !== undefined) room.timerDuration = Math.max(0, Math.trunc(timerDuration));
  if (Number.isFinite(dayTimer) && dayTimer !== undefined) {
    room.dayTimer = Math.max(0, Math.trunc(dayTimer));
    if (room.timerRunning && !hasTimerRunning) room.lastTimerAt = Date.now();
  }
  if (hasTimerRunning) {
    room.timerRunning = timerRunning;
    room.lastTimerAt = Date.now();
  }
}
