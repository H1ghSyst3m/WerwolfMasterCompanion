# Online Mode

## Overview

Online Mode lets a GM host a room while players use their own phones. The server is the source of truth. Browser clients send commands and render role-filtered websocket snapshots.

Online Mode v1 is intentionally simple:

- in-memory rooms
- no database
- no authentication beyond room code and reconnect tokens
- process restart loses all rooms

---

## Server Runtime

| Command / endpoint | Purpose |
|---|---|
| `npm run server:dev` | Development server with `tsx watch` |
| `npm run server:start` | Runtime server with `tsx` |
| `GET /health` | Health check returning `{ ok, rooms }` |
| `WS /ws` | Websocket endpoint |

Port selection:

1. `PORT`
2. `WERWOLF_PORT`
3. fallback `8787`

Invalid port values fall back safely to `8787`.

The websocket server sends heartbeat pings about every 25 seconds. Clients that do not answer with pong frames are terminated so dead sockets are cleaned up, while idle but healthy browser connections stay active through proxies.

---

## Frontend Environment

| Variable | Purpose |
|---|---|
| `VITE_WS_URL` | Websocket endpoint used by clients, for example `wss://example.com/ws`; `http(s)` values are normalized to `ws(s)` |
| `VITE_PUBLIC_APP_URL` | Public frontend URL used to generate QR/join links |

If `VITE_WS_URL` is omitted, the app uses the current hostname with port `8787` and path `/ws`.

---

## Room Lifecycle

```text
GM creates room
    │
    ├── Server returns room code and GM token
    ├── Lobby shows room code, join link, and QR code
    │
Players join
    │
    ├── Names must be unique among connected players
    ├── Offline lobby slots can be reclaimed by the same name
    └── Player reconnect tokens are stored locally
    │
GM locks lobby
    │
    └── New players can no longer join
    │
Setup and assignment
    │
    ├── GM chooses role counts and settings
    ├── Online hides the local Rollenaufdeckung setting
    └── GM assigns roles randomly or manually
    │
Role reveal
    │
    ├── Players reveal their own roles on their own phones
    └── GM sees seen/waiting status
    │
Playing
    │
    ├── GM controls night/day flow
    └── Players can reopen their private role card, including its footer role-description action
    │
Ended
    │
    └── GM can reset to lobby with existing players
```

Reset to lobby keeps the room code and all existing player records, including disconnected players. Player names, reconnect tokens, client ids, and connection state are carried forward for every player record. It clears roles, alive/dead state, lovers, logs, timers, night/day state, winner, and setup choices.

The GM can also cancel setup, role reveal, or a running game back to the lobby with the same reset behavior.

---

## GM Lobby Tools

### Close Room

The GM can close the room from the lobby. Connected clients receive a `roomClosed` message and return to the Online Mode entry screen. The room is deleted from server memory, all room sessions are removed, and old reconnect tokens stop working.

### Kick Player

The GM can remove players only in the lobby. Kicked connected players receive a `kicked` message and lose their stored session.

### Transfer GM

The GM can transfer host only in the lobby:

- target must be a connected player
- target is removed from the player list and becomes GM
- former GM receives a host-transfer handoff
- former GM can enter a unique name and rejoin the same room as a player

### Leave / Switch Room

Players can leave freely in the lobby, after game end, or after death. Alive players in a locked/running game cannot switch rooms.

---

## Reconnects

Known clients can reconnect while the server process is alive:

- GM reconnects with host token.
- Players reconnect with player token.
- Browser clients automatically reconnect with backoff and resume their stored/current session after transient socket closes.
- The last valid room snapshot stays visible during automatic reconnect; the manual retry and Fortsetzen buttons remain as fallback.
- When a player reconnects from a new socket, stale sessions for that player are removed.
- Player commands are accepted only from the current active client id.

If the server restarts, all in-memory room and token state is lost.

---

## Websocket Messages

Client messages use a typed envelope:

```ts
interface ClientMessage {
  type: string;
  requestId?: string;
  roomCode?: string;
  clientToken?: string;
  payload?: unknown;
}
```

The server validates known message types and payload shapes before dispatching to `RoomManager`.

Server messages include:

- `connected`
- `snapshot`
- `roomClosed`
- `hostTransferred`
- `kicked`
- `leftRoom`
- `error`

Snapshots are role-filtered:

- GM receives full room/game state.
- Each player receives lobby status, their own player record, reveal state, public player list, and winner.

---

## Player Role Visibility

Online role reveal is player-owned:

- During `roleReveal`, each player sees the card reveal flow on their own phone.
- After reveal/game start, the role is not shown inline in the player list.
- Players can open their own private role card with the small card button.
- After a private card has been revealed once, the info button beside the footer action opens the player's role description.
- Player-facing role descriptions hide the large role title, icon, and team badge; GM role info remains fully labeled.

This avoids accidental role exposure while preserving access for the player.

---

## Nachtgast Online Behavior

Nachtgast uses the same GM-controlled night step in Local and Online Mode:

- The GM chooses `nachtgastTarget` before the wolves act.
- The selected host is included only in the GM snapshot and server room state.
- Player snapshots do not expose the host choice.
- Reset to lobby and new nights clear `nachtgastTarget` with the rest of per-night state.

## Beschützer Online Behavior

Beschützer is server-owned in Online Mode:

- The GM chooses `beschuetzerTarget` after Nachtgast and before the wolves act.
- The server validates that the target is living, is not the alive Beschützer, and is not `beschuetzerLastTarget`.
- The GM snapshot includes `beschuetzerTarget` and `beschuetzerLastTarget`; player snapshots do not expose protection choices.
- On resolution, protection prevents only the wolf attack. Witch poison, Hunter shots, day vote, lover deaths, and other non-wolf effects still apply normally.
- Reset to lobby clears both fields. New nights clear `beschuetzerTarget` while preserving `beschuetzerLastTarget` for the repeat-target rule.

## Wildes Kind Online Behavior

Wildes Kind is server-owned in Online Mode:

- The GM chooses `wildesKindVorbild` in night 1 after Amor/Liebespaar and before Nachtgast/Beschützer/Werwölfe.
- The server validates that the role model is living and is not the alive Wildes Kind.
- The GM snapshot includes `wildesKindVorbild`; player snapshots do not expose the choice.
- The server checks for conversion only after known death resolution points: night resolution, day vote, Hunter shots, and lover heartbreak chains.
- When the role model is newly dead and the Wildes Kind still lives, the server changes the current role to `werwolf` and keeps `originalRole = "wildeskind"`.
- Player snapshots still do not include logs. The converted player sees the updated private role card as `Werwolf (ehem. Wildes Kind)`.
- Reset to lobby clears `wildesKindVorbild`. New nights preserve it.

## Verfluchter Online Behavior

Verfluchter conversion is owned by the server:

- When the GM advances out of the wolves step after wolves targeted Verfluchter, the server changes that player to `role = "werwolf"` and keeps `originalRole = "verfluchter"`.
- The GM snapshot includes `verfluchterConvertedThisNight`, the log entry, and the inserted GM-only notification step.
- Player snapshots still do not include logs. The converted player sees the updated private role card as `Werwolf (ehem. Verfluchter)`.
- Reset to lobby and new nights clear `verfluchterConvertedThisNight` with the rest of per-night state.

## Blinzelmädchen Online Behavior

Blinzelmädchen has no server-owned action:

- It is assigned, revealed, saved in snapshots, and reset like any normal role.
- The player-facing role text describes the table behavior; no websocket command or room state field is used for blinking.
- Player snapshots expose it only as that player's own private role, following normal role visibility rules.

## Harter Bursche Online Behavior

Harter Bursche wounds are server-owned in Online Mode:

- When an unprotected, unhealed wolf attack hits Harter Bursche, the server stores `harterBurscheWounded` and inserts a GM-only `harterbursche` notification step before dawn.
- The GM snapshot includes the wound fields and the log entry; player snapshots do not expose pending wound state.
- The GM quietly informs the player. The player remains alive and selectable until the next night resolves.
- If the wounded player is still alive in the next night resolution, the server kills them at the following dawn.
- Reset to lobby clears both Harter-Bursche wound fields. New nights clear only `harterBurscheWoundedThisNight`, preserving the pending delayed death.
