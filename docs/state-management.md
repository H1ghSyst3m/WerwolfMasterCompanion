# State Management - Werwolf Master Companion

## Overview

State management is mode-specific:

- **Local Mode:** React hooks own the game state and persist to `localStorage`.
- **Online Mode:** the Node `RoomManager` owns room/game state; React clients render websocket snapshots and send commands.

There is still no Redux, Zustand, or app-wide Context store.

---

## Hook Ownership

### `useGameState` - `src/hooks/useGameState.ts`

Core Local Mode game state that persists across phases.

| State | Type | Description |
|-------|------|-------------|
| `phase` | `AppPhase` | Current app phase: `"setup"`, `"roleReveal"`, `"playing"`, or `"ended"` |
| `setupStep` | `number` | Current setup step (1-3) |
| `players` | `Player[]` | All players with their roles and alive status |
| `round` | `number` | Current round number (starts at 1) |
| `gamePhase` | `GamePhase` | `"night"` or `"day"` within a round |
| `log` | `LogEntry[]` | Full game log shown in overlay and game-over screen |
| `winner` | `WinReason \| null` | Set when the game ends |
| `dayDeaths` | `Player[]` | Players who died last night, shown in `NightReport` |
| `dayVoteDone` | `boolean` | Whether today's vote has been cast |
| `voteConfirm` | `Player \| null` | Player pending confirmation before elimination |

Derived values computed from `players`:

| Value | Description |
|-------|-------------|
| `alive` | `players.filter(p => p.alive)` |
| `wolvesAlive` | Alive wolf-team players in Local Mode's current state |
| `villageAlive` | Alive non-wolf players in Local Mode's current state |
| `hasRole(r)` | `true` if any player currently has role `r` |
| `hadRole(r)` | `true` if any player ever had role `r`, using `originalRole` |
| `aliveWithRole(r)` | `true` if an alive player currently has role `r` |
| `addLog(text, r?, gp?)` | Appends a log entry |

### `useNightActions` - `src/hooks/useNightActions.ts`

All state specific to a single night's actions. Per-night state is cleared via `resetNightActions()` when Local Mode moves from night to day and when it starts the next night.

| State | Type | Description |
|-------|------|-------------|
| `nightStepIdx` | `number` | Index into the `nightSteps` array |
| `nightVictim` | `number \| null` | ID of the player wolves chose |
| `nachtgastTarget` | `number \| null` | ID of the player Nachtgast visits this night |
| `beschuetzerTarget` | `number \| null` | ID of the player Beschützer protects this night |
| `beschuetzerLastTarget` | `number \| null` | ID of the player Beschützer protected on the previous resolved night |
| `verfluchterConvertedThisNight` | `number \| null` | ID of a Verfluchter converted by wolves this night, used for the GM notification step and same-night role effects |
| `urwolfTransform` | `boolean \| null` | Whether Urwolf chose to transform this night |
| `urwolfUsed` | `boolean` | Whether the Urwolf ability has been used ever |
| `seerTarget` | `number \| null` | Player the Seher inspected |
| `seerRevealed` | `boolean` | Whether the result is shown on screen |
| `auraSeerTarget` | `number \| null` | Player the Aura-Seher inspected |
| `auraSeerRevealed` | `boolean` | Whether the aura result is shown |
| `detectivePicks` | `number[]` | 0-2 player IDs the Detektiv selected |
| `detectiveRevealed` | `boolean` | Whether the comparison result is shown |
| `witchHealUsed` | `boolean` | Permanent: has the heal potion been used ever? |
| `witchPoisonUsed` | `boolean` | Permanent: has the poison potion been used ever? |
| `witchHealThisRound` | `boolean` | Did the witch heal tonight? |
| `witchPoisonTarget` | `number \| null` | ID of the player poisoned tonight |
| `amorPick` | `number[]` | IDs of the two lovers, set in night 1 only |
| `nightResolved` | `boolean` | Whether `resolveNight()` has run for this night |

`resetNightActions()` resets all per-night fields except `beschuetzerLastTarget`, `urwolfUsed`, `witchHealUsed`, `witchPoisonUsed`, and `amorPick`, which persist across nights.

### `useTriggerQueue` - `src/hooks/useTriggerQueue.ts`

Manages the queue of pending death triggers, currently only Hunter.

| State | Type | Description |
|-------|------|-------------|
| `triggerQueue` | `Trigger[]` | Ordered list of pending triggers |
| `currentTrigger` | `Trigger \| null` | `triggerQueue[0]`, the active trigger |

`resolveHunter()` lives in `werwolf-app.tsx` because it needs to update both `players` and `triggerQueue` atomically.

### `useTimer` - `src/hooks/useTimer.ts`

Day discussion countdown timer, independent of game rules.

| State | Type | Description |
|-------|------|-------------|
| `dayTimer` | `number` | Remaining seconds |
| `timerRunning` | `boolean` | Whether the timer is ticking |
| `timerDuration` | `number` | Selected duration, default 300 seconds |
| `dayTimerRef` | `RefObject<number>` | Always-current timer value for save/restore |

`formatTime(s)` converts seconds to `"M:SS"`.

### `useSaveLoad` - `src/hooks/useSaveLoad.ts`

Manages Local Mode `localStorage` persistence.

| State | Type | Description |
|-------|------|-------------|
| `loaded` | `boolean` | Whether the initial load check has completed |
| `showRestore` | `boolean` | Whether to show the restore prompt |
| `pendingRestore` | `SaveState \| null` | The deserialized saved state |

| Function | Description |
|----------|-------------|
| `saveGame(state)` | Serializes and writes to `localStorage["werwolf-save"]` |
| `deleteSave()` | Removes `localStorage["werwolf-save"]` |

`useSaveLoad()` validates schema 1/2 saves and migrates legacy `"rolereveal"` to `"roleReveal"`.

### `usePrefs` - `src/hooks/usePrefs.ts`

User preferences for Local Mode game rules.

| State | Type | Default | Description |
|-------|------|---------|-------------|
| `winMode` | `WinMode` | `"standard"` | Win condition mode: `"standard"` or `"extended"` |
| `revealMode` | `RevealMode` | `"role"` | What is revealed after elimination: `"hidden"`, `"team"`, or `"role"` |
| `roleReveal` | `boolean` | `false` | Whether the Local Mode Role Reveal phase is shown before the game starts |

| Function | Description |
|----------|-------------|
| `setWinMode(m)` | Updates `winMode` |
| `setRevealMode(m)` | Updates `revealMode` |
| `setRoleReveal(v)` | Updates `roleReveal` |
| `setPrefs(p)` | Bulk-updates all preferences at once, used by `restoreState()` |
| `reset()` | Reapplies default preference values for a new local game |

Defaults are shared through `src/constants/gameOptions.ts`.

---

## Preferences persistence (`werwolf-prefs`)

| Layer | Key | Purpose |
|-------|-----|---------|
| Per-game save | `werwolf-save` | Full Local Mode game snapshot restored after selecting Local Mode |
| Online reconnect | `werwolf-online-session` | Room reconnect token; not a game-state save |

Local game state and Online reconnect state are independent. Online room state lives in the server process, not in browser `localStorage`.

---

## Local state in `werwolf-app.tsx`

State owned directly by the root component, not by a hook. It is included in `SaveState` through `buildSaveState()`.

| State | Type | Default | Description |
|-------|------|---------|-------------|
| `roleCounts` | `RoleCounts` | `{ werwolf: 0, dorfbewohner: 0 }` | Role-to-count mapping chosen during setup |
| `assignMode` | `AssignMode` | `null` | `"random"`, `"manual"`, or `null` before mode selection |
| `manualAssign` | `ManualAssign` | `{}` | Map of player id to manually assigned role |

`buildSaveState()` collects all local hook/root state into `SaveState`. `restoreState()` hydrates all hooks from a saved snapshot.

---

## Data Flow Diagram

```text
werwolf-app.tsx
    │
    ├── useGameState()    → gs.players, gs.phase, gs.addLog, ...
    ├── useNightActions() → na.nightVictim, na.resetNightActions, ...
    ├── useTriggerQueue() → tq.currentTrigger, tq.setTriggerQueue
    ├── useTimer()        → timer.dayTimer, timer.timerRunning, ...
    ├── useSaveLoad()     → sl.saveGame, sl.loaded, sl.pendingRestore, ...
    └── usePrefs()        → prefs.winMode, prefs.revealMode, prefs.setPrefs, ...
    │
    ├── buildNightSteps(gs.round, na.urwolfUsed, ...)
    │         → nightSteps[]
    │
    ├── advanceNightStep() - uses na, nightSteps
    ├── resolveNight()    - reads na, writes gs.players, tq.triggerQueue
    ├── resolveHunter()   - reads tq, writes gs.players, tq.triggerQueue
    ├── handleDayVote()   - reads gs, writes gs.players, tq.triggerQueue
    ├── startDay()        - writes gs.gamePhase, na.resetNightActions(), timer
    ├── startNight()      - writes gs.round, gs.gamePhase, na.resetNightActions()
    └── buildSaveState()  → SaveState snapshot from all hooks
                              → sl.saveGame(snapshot) via useEffect
```

---

## State Dependencies

Cross-hook dependencies are handled in `werwolf-app.tsx`:

- `resolveNight()` reads from `na` and writes to `gs.players`, `gs.dayDeaths`, and `tq.triggerQueue`.
- `resolveHunter()` reads from `tq.currentTrigger` and writes to `gs.players` and `tq.triggerQueue`.
- `handleDayVote()` reads from `gs`, writes to `gs.players`, and may enqueue triggers.
- `buildSaveState()` collects state from all hooks and root setup state.
- `restoreState()` hydrates all hooks from a `SaveState`.

This is intentional. Keeping cross-cutting Local Mode logic in the root component makes data flow explicit and avoids hidden app-wide state.

---

## Online Mode State

### Server Source of Truth

`server/roomManager.ts` owns Online Mode state:

- rooms and 6-character room codes
- GM host token and host client id
- player records, reconnect tokens, and connection state
- role counts, assignment mode, and manual assignments
- night/day/game-over runtime state
- lobby lock, reset to lobby, kick, and transfer GM

The server validates command ownership so stale or replaced sockets cannot act as the current player.

### Client Hook

`useOnlineRoom()` owns only connection/client state:

- websocket status
- latest snapshot
- current session token
- stored reconnect session
- host transfer handoff state
- send/reconnect helpers

It guards websocket event handlers so stale sockets cannot overwrite React state.

### Online Snapshots

The server sends role-filtered snapshots:

- GM snapshots include full room/game state and all player roles.
- Player snapshots include lobby status, the player's own record, reveal status, player list, and winner.
- Player roles are shown only when appropriate, and after reveal are accessed through the private role-card button.

### Online Controllers

- `OnlineGmController` renders shared GM screens from server snapshots and sends GM commands.
- `OnlinePlayerView` renders player-only lobby, role reveal, private role card, and room switching.
- `OnlineLobby` renders room code, QR/join link, kick, and GM transfer tools.

---

## Shared State Rules

Shared modules keep Local and Online behavior aligned:

- `src/domain/gameState.ts` for initial/reset/assignment helpers.
- `src/domain/roleDisplay.ts` for exact-role labels, including former-role displays after conversion.
- `src/logic/gameLogic.ts` for team lookup, kills, triggers, and win checks.
- `src/constants/roles.ts` for role metadata and role ID validation.
- `src/constants/gameOptions.ts` for win/reveal/winner option sets and default prefs.

When adding new rules, prefer shared domain/logic code first, then wire Local and Online controllers to it.
