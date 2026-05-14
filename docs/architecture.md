# Architecture - Werwolf Master Companion

## Overview

Werwolf Master Companion is a mobile-first game-master assistant for the social deduction game *Werwolf* (Werewolf).

The app has two modes:

- **Local Mode:** one-device GM flow backed by React state and `localStorage`.
- **Online Mode:** websocket-backed rooms where the server is the source of truth. The GM uses the same mode-aware screens as Local Mode, while players use a lightweight phone UI for join, lobby, role reveal, and private role card access.

Online Mode is v1 in-memory infrastructure: rooms and reconnect sessions survive while the Node process is running, but are lost on process restart.

---

## Tech Stack

| Tool | Version | Role |
|------|---------|------|
| React | 19 | UI framework |
| TypeScript | 5.9 strict | Type safety |
| Tailwind CSS | v4 | Styling |
| Vite | 8 | Frontend build/dev server |
| Node.js + `ws` | Node 22.12.0 target | Online websocket server |
| Vitest | repo version | Unit and websocket integration tests |
| ESLint | 9 | Linting |

---

## Runtime Entrypoints

| Command / endpoint | Purpose |
|---|---|
| `npm run dev` | Starts the Vite frontend |
| `npm run server:dev` | Starts the websocket server with `tsx watch` |
| `npm run server:start` | Starts the websocket server with `tsx` |
| `GET /health` | Server health check, returns `{ ok, rooms }` |
| `WS /ws` | Websocket route for GM and player clients |

The websocket server listens on `PORT`, then `WERWOLF_PORT`, then defaults to `8787`.

---

## Folder Layout

```text
server/
├── index.ts                    # Node HTTP + websocket entrypoint; exposes GET /health and WS /ws
├── roomManager.ts              # Online source of truth: rooms, host/player sessions, commands, snapshots, timers
├── roomManager.test.ts         # Room/session/gameplay unit tests
└── websocket.test.ts           # Websocket route and transport integration tests

src/
├── types.ts                    # All shared TypeScript interfaces and types
├── main.tsx                    # React entry point
├── werwolf-app.tsx             # Mode selection + Local Mode root orchestrator
│
├── constants/
│   ├── roles.ts                # ROLES record: all role definitions, role IDs, role validation source
│   └── gameOptions.ts          # Win/reveal/winner option sets and default prefs
│
├── domain/
│   ├── gameState.ts            # Shared game-state helpers used by Local Mode and server
│   ├── roleDisplay.ts           # Exact-role display helper for converted/former roles
│   └── persistedPhase.ts       # Save migration helper for legacy "rolereveal" -> "roleReveal"
│
├── logic/
│   ├── gameLogic.ts            # Pure functions: checkWin(), killPlayer(), getTeam()
│   └── nightSteps.ts           # Pure function: buildNightSteps() constructs the night step array
│
├── online/
│   ├── messages.ts             # Websocket command/snapshot types + runtime message validation
│   ├── wsUrl.ts                # Browser-only websocket URL resolution
│   ├── useOnlineRoom.ts        # Websocket connection hook, reconnect storage, stale socket guards
│   ├── OnlineApp.tsx           # Online route between home, GM controller, and player view
│   └── OnlineGmController.tsx  # Reuses GM screens from snapshots and sends commands
│
├── hooks/
│   ├── useGameState.ts         # Core local state: phase, players, round, log, winner, derived values
│   ├── useNightActions.ts      # Night-specific action state + resetNightActions()
│   ├── useTriggerQueue.ts      # Trigger queue (hunter chain deaths)
│   ├── useTimer.ts             # Day discussion countdown timer
│   ├── useSaveLoad.ts          # localStorage save / restore / delete for Local Mode
│   └── usePrefs.ts             # User preferences: winMode, revealMode, roleReveal
│
└── components/
    ├── ui/
    │   ├── Modal.tsx           # Overlay modal wrapper
    │   ├── Btn.tsx             # Styled button primitive
    │   └── PlayerChip.tsx      # Player row / selectable chip
    │
    ├── online/
    │   ├── OnlineHome.tsx      # Create/join/resume Online Mode entry screen
    │   ├── OnlineLobby.tsx     # GM lobby with room code, QR link, kick, transfer
    │   ├── OnlinePlayerView.tsx # Player-only join/wait/reveal/private role card view
    │   └── RoomJoinQr.tsx      # QR code + join link generation/copy UI
    │
    ├── setup/
    │   ├── SetupScreenShell.tsx # Consistent sticky-header / scrollable-body / sticky-footer shell
    │   ├── SetupStep1.tsx       # Step 1: add/remove players (Local Mode)
    │   ├── SetupStep2.tsx       # Step 2: pick role counts + game rules
    │   ├── SetupStep3.tsx       # Step 3: random/manual role assignment
    │   └── RoleRevealScreen.tsx # Drag-to-peek role reveal phase used by Local and Online player UI
    │
    ├── night/
    │   ├── NightPhase.tsx       # Night orchestrator (progress bar + step dispatch)
    │   ├── NightStepSleep.tsx   # "Alle schlafen ein"
    │   ├── NightStepWolves.tsx  # Wolf victim selection
    │   ├── NightStepVerfluchter.tsx # GM-only notification after Verfluchter conversion
    │   ├── NightStepUrwolf.tsx  # Urwolf: kill vs transform
    │   ├── NightStepNachtgast.tsx # Nachtgast: pick a host before wolves
    │   ├── NightStepBeschuetzer.tsx # Beschützer: protect one player before wolves
    │   ├── NightStepAmor.tsx    # Amor: pick lovers
    │   ├── NightStepLovers.tsx  # Lovers open eyes
    │   ├── NightStepSeer.tsx    # Seher: pick + reveal role
    │   ├── NightStepAuraSeer.tsx # Aura-Seher: pick + reveal team
    │   ├── NightStepDetective.tsx # Detektiv: compare two players
    │   ├── NightStepWitch.tsx   # Hexe: heal / poison
    │   └── NightStepDawn.tsx    # "Nacht auswerten" button
    │
    ├── day/
    │   ├── DayPhase.tsx         # Day orchestrator (timer + vote)
    │   ├── DiscussionTimer.tsx  # Countdown timer UI
    │   └── VotePanel.tsx        # Vote list + confirmation dialog
    │
    ├── NightReport.tsx          # "Nachtbericht": who died last night
    ├── HunterTrigger.tsx        # Hunter modal (immediate, blocking)
    ├── GameOver.tsx             # Winner screen + player overview + log
    ├── RestoreScreen.tsx        # "Spielstand gefunden" restore prompt
    ├── ModeSelection.tsx        # First screen: Lokal vs Online
    └── PlayerOverlay.tsx        # Player list + tap-for-role-info modal
```

---

## Data Flow

### Local Mode

```text
werwolf-app.tsx
  │
  ├── useGameState       ← players, phase, round, log, win state
  ├── useNightActions    ← all night-specific inputs per role
  ├── useTriggerQueue    ← hunter chain death queue
  ├── useTimer           ← day discussion countdown
  ├── useSaveLoad        ← localStorage save/restore/delete (werwolf-save)
  └── usePrefs           ← Prefs (winMode, revealMode, roleReveal)
         │
         ▼
   buildSaveState() → saveGame(state)
         │
         ▼
   restoreState(s) → hydrates all hooks on restore
```

Local Mode is fully client-side and works offline. There is no Redux, Zustand, or app-wide Context store. The root component composes hooks and passes the minimum needed props to each child component.

### Online Mode

```text
Browser client
  └── useOnlineRoom()
        ├── sends ClientMessage commands
        └── receives role-filtered ServerMessage snapshots

Node server
  └── RoomManager
        ├── owns rooms, players, roles, timers, and reconnect tokens
        ├── validates command ownership
        ├── applies shared game rules
        └── broadcasts role-filtered snapshots
```

The GM frontend is not duplicated. `OnlineGmController` renders the same setup, assignment, night/day, game-over, and overlay components using server snapshots. Player phones use separate lightweight UI because they only need join/lobby/role reveal/private role card flows.

---

## Design Principles

- **Single GM frontend:** Local and Online share GM screens wherever practical.
- **Server source of truth online:** Online clients render snapshots and send commands; they do not own game state.
- **Role-filtered snapshots:** GM receives full state; each player receives only their own role when roles are visible.
- **Shared rules:** Assignment, reset, win checks, teams, and role metadata live in shared domain/logic/constants modules.
- **Mobile-first:** Layouts are single-column with large tap targets and sticky controls.
