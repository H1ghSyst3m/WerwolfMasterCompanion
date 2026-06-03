# Save & Load - Werwolf Master Companion

## Overview

Local Mode automatically saves the current game to `localStorage`. The app shows Mode Selection first; after the user selects Local Mode and `LocalGame` mounts, a valid saved game shows the restore prompt.

Online Mode uses different persistence: the server owns room state and full session data in memory, while each browser stores only a compact online reconnect record with the token plus room metadata.

---

## Local Mode Game Save

```text
localStorage["werwolf-save"]
```

The value is a JSON-serialized `SaveState` object from `src/types.ts`.

New saves are written with:

```ts
schemaVersion: 2
```

Restore accepts schema `1` and `2`. During restore validation, legacy phase `"rolereveal"` is normalized to canonical `"roleReveal"`.

---

## Preferences

```text
localStorage["werwolf-prefs"]
```

Preferences are stored under a separate key from the per-game save. They are read/written by `usePrefs` and use the `Prefs` shape from `src/types.ts`:

```ts
{ winMode: WinMode; revealMode: RevealMode; roleReveal: boolean }
```

- Written automatically whenever a `Prefs` field changes.
- Initialized from this key when `usePrefs` mounts.
- Defaults come from shared game option constants.
- Stored independently from `SaveState`; preferences do not affect online room restore.
- Intentionally mirrored into Local Mode `SaveState` snapshots by `buildSaveState()` so restored games keep the same `winMode`, `revealMode`, and `roleReveal` settings.

---

## Online Session Storage

```text
localStorage["werwolf-online-session"]
```

Online clients store a compact reconnect record:

- `roomCode`
- `clientToken`
- `role` (`"gm"` or `"player"`)
- `savedAt`

This is only a reconnect handle. The full session object and actual room state remain in the server `RoomManager` and are lost if the server process restarts.

The same record is used for automatic reconnect/resume after transient websocket closes and for the manual Fortsetzen action. It is not a full online room save.

When the GM closes an online room, connected clients delete this record. Disconnected clients may still have the stale record locally, but resume fails because the server room and tokens were removed.

---

## SaveState Shape

```ts
interface SaveState {
  schemaVersion: number;
  phase: "roleReveal" | "playing" | "ended";
  setupStep: number;
  players: Player[];
  roleCounts: RoleCounts;
  assignMode: AssignMode;
  manualAssign: ManualAssign;

  round: number;
  gamePhase: "night" | "day";

  nightStepIdx: number;
  nightVictim: number | null;
  nachtgastTarget: number | null;
  beschuetzerTarget: number | null;
  beschuetzerLastTarget: number | null;
  wildesKindVorbild: number | null;
  verfluchterConvertedThisNight: number | null;
  wolvesSkipNextNight: boolean;
  harterBurscheWounded: number | null;
  harterBurscheWoundedThisNight: number | null;
  urwolfTransform: boolean | null;
  urwolfUsed: boolean;
  seerTarget: number | null;
  seerRevealed: boolean;
  auraSeerTarget: number | null;
  auraSeerRevealed: boolean;
  detectivePicks: number[];
  detectiveRevealed: boolean;
  witchHealUsed: boolean;
  witchPoisonUsed: boolean;
  witchHealThisRound: boolean;
  witchPoisonTarget: number | null;
  amorPick: number[];
  nightResolved: boolean;

  dayDeaths: Player[];
  dayVoteDone: boolean;
  dayVoteVictimId: number | null;
  triggerQueue: Trigger[];

  log: LogEntry[];
  winner: WinReason | null;
  winMode: WinMode;
  revealMode: RevealMode;
  roleReveal: boolean;
  timerDuration: number;
  dayTimer: number;
}
```

---

## Auto-Save Trigger

The auto-save `useEffect` in `werwolf-app.tsx` watches the relevant local state values:

```ts
useEffect(() => {
  if (!slLoaded) return;
  if (gs.phase === "roleReveal" || gs.phase === "playing" || gs.phase === "ended") {
    const t = setTimeout(() => slSaveGame(buildSaveState()), 500);
    return () => clearTimeout(t);
  }
}, [slLoaded, gs.phase, gs.players, gs.round, ...]);
```

The local phases that are saved are:

- `"roleReveal"`
- `"playing"`
- `"ended"`

Key points:

- Setup is not auto-saved.
- Saves are debounced by 500ms to batch rapid state changes.
- The snapshot includes setup fields (`roleCounts`, `assignMode`, etc.) as context captured at game start.
- `wildesKindVorbild` is game-wide role state: it survives normal night resets and restores to `null` for older schema-2 saves that do not contain the field.
- `wolvesSkipNextNight` is pending Verseuchter state: it survives normal night resets until consumed and restores to `false` for older schema-2 saves that do not contain the field.

---

## Timer Save/Restore

The timer's live `dayTimer` value is saved from `dayTimerRef.current`, not from potentially stale React state. This avoids stale-closure issues in the delayed save callback.

On restore, `timerRunning` is always set to `false`; the timer must be manually restarted.

---

## Restore Flow

1. The user selects Local Mode.
2. `LocalGame` mounts and `useSaveLoad` reads `werwolf-save`.
3. `isSaveState()` validates the shape and supported schema version.
4. Legacy `"rolereveal"` is normalized to `"roleReveal"`.
5. `RestoreScreen` is shown.
6. `restoreState()` hydrates all local hooks and preferences.
7. If the user discards the save, `deleteSave()` removes it.

---

## Delete / Reset

- `deleteSave()` removes `localStorage["werwolf-save"]`.
- Called when a new Local Mode game is started via `resetGame()`.
- Also called when the user discards a pending restore.

---

## Known Limitations

- Only one local save slot exists.
- Private browsing or storage quota errors are ignored safely.
- Save compatibility is intentionally strict: unsupported schemas and malformed saves are rejected instead of partially loaded.
- Schema migration currently covers legacy `"rolereveal"` to `"roleReveal"`.
- Online rooms are not persisted to disk or database in v1.
