# Game Flow - Werwolf Master Companion

## High-Level Flow

```text
App Launch
    │
    ├── Mode Selection
    │       ├── Lokal
    │       │       ├── Check localStorage for saved game
    │       │       │       ├── Found (phase=roleReveal/playing/ended) → RestoreScreen
    │       │       │       └── Not found → Setup Phase
    │       │       └── Local Mode one-device GM flow
    │       │
    │       └── Online
    │               ├── GM creates room
    │               ├── Players join room
    │               └── Server owns room/game state
```

Local Mode keeps the original one-device GM flow. Online Mode adds rooms, player phones, websocket snapshots, and server-owned game state. See `docs/online-mode.md` for the detailed Online Mode lifecycle.

---

## Local Mode Flow

```text
Local Mode
    │
    ├── Check localStorage for saved game
    │       ├── Found → RestoreScreen
    │       └── Not found → Setup Phase
    │
    ▼
Setup Phase (3 steps)
    ├── Step 1: Add players (min. 5)
    │           A small "Liste leeren" button clears the list when players exist.
    ├── Step 2: Choose role counts (must sum to player count)
    │           Spielregeln includes winMode, revealMode, and roleReveal
    └── Step 3: Assign roles
            │
            ├── Mode selection (assignMode = null)
            │       ├── "Zufällig verteilen" → shuffle roles, enter random mode
            │       ├── "Manuell zuweisen"   → enter manual mode
            │       └── Header ← → go back to Step 2
            │
            ├── Random mode (assignMode = "random")
            │       ├── Roles are shuffled and shown per player
            │       ├── "Neu würfeln" re-shuffles
            │       ├── "Spiel starten!" → startGame()
            │       └── Header ← → clear assigned roles, return to mode selection
            │
            └── Manual mode (assignMode = "manual")
                    ├── GM assigns a role to each player via dropdown selects
                    ├── Role quota badges track used vs. total per role
                    ├── "Spiel starten!" enabled only when all roles are fully distributed
                    └── Header ← → clear manual assignments, return to mode selection
            │
            ▼ startGame()
            ├── roleReveal enabled → Role Reveal Phase
            │       │
            │       ▼ onDone()
            └── roleReveal disabled → Playing Phase (directly)
            │
Role Reveal Phase (phase = "roleReveal")
    │   Shown only when roleReveal pref is true.
    │   Saved in schemaVersion 2 if the app closes during this phase.
    ├── Cycles through each player one by one
    │       ├── Shows current player's name
    │       ├── A cover card hides the role underneath
    │       ├── Player drags card upward to reveal role while held
    │       ├── On pointer release → card snaps back, role hidden again
    │       └── "Weiter" button advances to next player after reveal
    └── After last player → onDone() → Playing Phase
            │
            ▼
Playing Phase ──────────────────────────────────┐
    │                                            │
    ▼  (round 1)                                 │
Night Phase                                      │
    │                                            │
    ├── Night Steps (see below)                  │
    ├── resolveNight()                           │
    │       ├── Apply Beschützer / wolf kill /   │
    │       │   Verfluchter / Urwolf             │
    │       ├── Apply witch poison               │
    │       └── Set dayDeaths, trigger queue     │
    ├── [Hunter trigger if applicable]           │
    ├── NightReport (shown once queue is empty)  │
    │                                            │
    ▼  startDay()                                │
Day Phase                                        │
    ├── Discussion timer                         │
    ├── Vote to eliminate a player               │
    │       ├── Narr voted → "narr" win          │
    │       ├── Dorftrottel voted in round 1     │
    │       │       → "dorftrottel" win          │
    │       └── Normal kill → killPlayer()        │
    │               ├── Lover heartbreak         │
    │               │   resolved inline          │
    │               ├── Hunter trigger(s) →      │
    │               │   enqueue → [Hunter modal] │
    │               │   → checkWin()             │
    │               └── No trigger → checkWin()  │
    ├── [Reveal card shown if revealMode !=      │
    │    "hidden" until "Nacht einleiten"]       │
    │                                            │
    ▼  startNight()                              │
Next Night  ─────────────────────────────────────┘
    │
    ▼  when checkWin() returns a non-null result
Game Over (phase = "ended")
    │
    └── "Neues Spiel" button calls resetGame(keepPlayers=true):
            ├── Player list is kept (roles/alive/lover reset to initial state)
            ├── All other game state is fully reset (log, round, night actions, etc.)
            └── Returns to Setup Step 1. Same players, roles cleared
                    • Use "Liste leeren" in Setup Step 1 to remove all
                      players and start fresh.
```

The Local Mode flow above is intentionally detailed because it is the baseline that Online Mode reuses for GM screens.

---

## Online Mode Flow

```text
Online Mode
    │
    ├── GM creates room
    │       └── Lobby shows room code, join link, and QR code
    │
    ├── Players join by code or link
    │       └── Server stores reconnect tokens while process is alive
    │
    ├── GM locks lobby
    │       └── No new players may join after setup starts
    │
    ├── GM chooses role counts/settings
    │       └── Online hides the local Rollenaufdeckung setting in setup
    │
    ├── GM assigns roles
    │
    ├── Online Role Reveal
    │       ├── Each player reveals their own role on their own phone
    │       └── GM sees per-player "seen/waiting" status
    │
    ├── Playing Phase
    │       ├── GM controls night/day using shared GM screens
    │       └── Players can reopen their private role card via a small button
    │
    └── Game Over
            └── GM can reset to lobby with existing players
```

Online lobby tools:

- Kick players from the lobby.
- Transfer GM to a connected player while in the lobby.
- Let the former GM join the same room as a normal player after transfer.
- Reset from game over back to lobby while preserving all existing player records, including disconnected players.

Online Mode does not duplicate the GM frontend. `OnlineGmController` renders shared setup, assignment, night/day, overlay, and game-over components from server snapshots. Player phones use the separate player-only view for join, lobby waiting, role reveal, and private role access.

The rest of this document describes the shared game flow and Local Mode baseline. Online-specific room lifecycle details live in `docs/online-mode.md`.

---

## Night Step Order

Night steps are built dynamically each round by `buildNightSteps()` in `src/logic/nightSteps.ts`.

| # | Step ID | Condition |
|---|---------|-----------|
| 1 | `sleep` | Always |
| 2 | `amor` | `hadRole("amor") && round === 1` |
| 3 | `lovers` | `hadRole("amor") && round === 1` |
| 4 | `nachtgast` | `hadRole("nachtgast")` |
| 5 | `beschuetzer` | `hadRole("beschuetzer")` |
| 6 | `wolves` | Always |
| 7 | `verfluchter` | `verfluchterConvertedThisNight !== null` |
| 8 | `urwolf` | `hadRole("urwolf")` |
| 9 | `seer` | `hadRole("seher")` |
| 10 | `auraseer` | `hadRole("auraseher")` |
| 11 | `detective` | `hadRole("detektiv")` |
| 12 | `witch` | `hadRole("hexe")` |
| 13 | `dawn` | Always |

If a role is dead or exhausted, the step still appears to preserve rhythm but shows an inactive placeholder.

---

## Role Interactions

### Wolves + Urwolf

- Wolves select a victim during the `wolves` step.
- Wolf-aligned players and valid victims are derived through effective-team logic, so in-progress Urwolf transformations are handled consistently.
- If Urwolf is alive and has not used the ability, the `urwolf` step follows immediately.
- The Urwolf player decides: **kill** (normal) or **transform** (victim becomes a Werwolf, Urwolf ability consumed).
- Transformation is processed in `resolveNight()`, changes the victim's current role to `"werwolf"`, and updates `urwolfUsed = true`.
- `originalRole` remains the victim's starting role so the game-over screen can show the original/current role difference.
- If the wolf victim was Verfluchter, conversion happens when advancing out of `wolves`, before Urwolf and seer-style steps. The Urwolf step still appears if the Urwolf exists and is unused, but it is blocked for that target and the ability remains available.
- If Beschützer protected the wolf victim, the attack is prevented before Urwolf can transform the target. The Urwolf step is blocked and the ability remains available.

### Nachtgast

- Nachtgast wakes before the wolves and chooses one other living player as host for the night.
- Nachtgast only affects Werwolf attacks. Other death causes apply normally.
- If wolves attack Nachtgast directly, the attack misses because Nachtgast is away.
- If wolves attack the host, the host is the main target and Nachtgast is also hit.
- Witch heal only saves the main wolf target; Nachtgast still dies if the host was attacked.
- Urwolf transforming the host still hits Nachtgast. A direct Urwolf transform attempt against an away Nachtgast does nothing and does not consume the ability.
- If Nachtgast visits Verfluchter and wolves attack that host, Verfluchter converts and survives while Nachtgast dies.
- If Beschützer protects Nachtgast's host, the wolf attack is prevented before it hits the location, so both host and Nachtgast survive.

### Beschützer

- Beschützer wakes after Nachtgast and before the wolves.
- Beschützer chooses one living player to protect for the current night.
- Beschützer cannot protect themselves and cannot protect the same player two nights in a row.
- If wolves attack the protected player, the wolf attack is prevented: no main target death, no Nachtgast collateral, no Verfluchter conversion, and no Urwolf transform.
- Protection only applies to the wolf attack. Witch poison, Hunter shots, day vote, lover deaths, and other non-wolf effects still kill normally.
- `beschuetzerTarget` stores the current protected player. `beschuetzerLastTarget` stores the previous protected player to block repeat protection.

### Verfluchter

- Verfluchter starts as village-aligned and has no normal night action.
- A wolf attack converts Verfluchter instead of killing them: `role = "werwolf"`, `originalRole = "verfluchter"`.
- The conversion is GM-secret. Local Mode records it in the GM log; Online Mode sends the log only in GM snapshots.
- `verfluchterConvertedThisNight` stores the converted player ID for the current night, inserts the GM notification step after `wolves`, and is reset with other per-night state.
- Exact-role displays use `getRoleDisplay()` so converted players show as `Werwolf (ehem. Verfluchter)`.
- Non-wolf deaths still kill Verfluchter normally through `killPlayer()`.
- If Beschützer protected Verfluchter, the wolf attack is prevented and no conversion happens.

### Witch

- Can **heal** the wolf victim once per game.
- Can **poison** any other player once per game.
- Healing prevents the wolf kill even if the victim was chosen.
- Both potions are tracked with `witchHealUsed` / `witchPoisonUsed`.
- Heal is hidden when Urwolf is transforming the victim because the victim will not die.
- Heal is also hidden when the direct wolf target is a visiting Nachtgast, because the wolf attack will not kill the main target.
- Heal is hidden and ignored for a converted Verfluchter. The poison potion may still target that converted player in the same night.
- Heal is hidden and ignored when Beschützer prevented the wolf attack. The poison potion may still target that protected player in the same night.

### Seer, Aura-Seer, and Detective

- Seer picks one player per night.
- If the target is currently being transformed by Urwolf or was converted from Verfluchter in the same round, `getEffectiveRole()` returns `"werwolf"` instead of the original role.
- Aura-Seer picks one player and learns only team, not exact role.
- Detective picks two players and learns whether they are on the same team.
- Aura-Seer and Detective use `getEffectiveTeam()` for each target, so transformed players count as wolf-aligned.

### Amor

- Amor acts only in round 1.
- Picks two players as lovers. Their IDs are stored in each other's `lover` field.
- If one lover dies for any reason, `killPlayer()` immediately kills the partner.
- Amor can pick themselves as one of the lovers.

### Hunter (Jäger)

- When the Hunter dies from day vote, night kill, or lover chain, a trigger `{ type: "hunter", victimId, victim, source }` is pushed to `triggerQueue`.
- `HunterTrigger` modal appears immediately and blocks all other UI.
- The Hunter player may shoot one alive player or pass.
- If the shot player is also a Hunter, another hunter trigger is added.

### Narr

- If voted out during the day, triggers an immediate special win for Narr.
- The Narr win bypasses normal `checkWin()` village/wolf logic.

### Dorftrottel

- Dorftrottel wins immediately when voted out in round 1.
- If alive at the end of round 1, their role is changed to `"dorfbewohner"` at `startNight()` and the demotion is logged.
- After round 1, a voted Dorftrottel is treated as a normal Dorfbewohner elimination.

### Lovers win condition

- Checked in `checkWin()`.
- If exactly 2 players are alive and both are in the lovers pair, lovers win.

---

## Win Conditions

| Result | Condition |
|--------|-----------|
| `"lovers"` | Exactly 2 alive players, both are lovers |
| `"village"` | No wolf-aligned players alive |
| `"wolves"` | Wolf count >= non-wolf count, subject to win mode |
| `"narr"` | Narr was voted out |
| `"dorftrottel"` | Dorftrottel was voted out in round 1 |

`checkWin(players, opts)` accepts:

- `witchHealUsed`
- `witchPoisonUsed`
- `winMode`
- `getTeamForPlayer`, optional effective-team resolver used when transient allegiance matters

### Win Mode

| Mode | Wolves win when |
|------|-----------------|
| `"standard"` | wolves >= village immediately |
| `"extended"` | wolves >= village and no living Jäger or potion-capable Hexe can still interfere |

### Elimination Reveal Mode

After a successful day vote, `revealMode` controls the reveal card before night starts:

| Mode | Behavior |
|------|----------|
| `"hidden"` | Show nothing |
| `"team"` | Show good/evil team |
| `"role"` | Show exact role |

---

## Trigger Queue

Hunter shots are queued in `triggerQueue` as `Trigger[]`. Lover-heartbreak deaths are resolved immediately inline inside `killPlayer()` and are not enqueued.

```ts
interface Trigger {
  type: "hunter";
  victimId: number; // numeric id of the player whose ability fires
  victim: string;   // display name of the triggering player
  source: string;   // what caused their death
}
```

The queue is processed one at a time: `HunterTrigger` consumes `triggerQueue[0]`. After resolution, if the queue is empty, `checkWin()` is called. If not empty, the next trigger fires.

Online Mode keeps the same trigger behavior on the server; the GM receives the resulting snapshot and resolves the modal through the shared GM UI.

---

## Role Reveal Phase

Shown in Local Mode when the `roleReveal` preference is enabled. Entered immediately after `startGame()` and before the first night.

**Purpose:** Players privately see their own role one by one, without the moderator needing physical role cards.

**Interaction (drag-to-peek):**

- A cover card is displayed in the center. The role is rendered underneath it.
- The player holds the cover card and drags it upward past the reveal threshold to uncover their role.
- The card follows the finger position while held.
- On pointer release (`pointerup` / `pointercancel`), the card snaps back down, hiding the role again.
- The next button is disabled while the card is being dragged or snapping back; it becomes active once the card is at rest and the role was seen.

**Keyboard interaction:**

- Tab to the cover card.
- Press **Space** or **Enter** to instantly reveal the role.
- With the role visible, press **Space** or **Enter** again to advance to the next player.

**Save behavior:** Current Local Mode saves can persist `"roleReveal"` with `schemaVersion: 2`; restore also accepts legacy `"rolereveal"` and normalizes it to `"roleReveal"`.

**Online behavior:** Online Mode always uses player-owned role reveal. Each player reveals their own role on their own phone, and the GM sees reveal completion status.

---

## Save / Restore

Local Mode autosaves `roleReveal`, `playing`, and `ended` phases to `localStorage["werwolf-save"]` with a 500ms debounce.

Current saves are written with `schemaVersion: 2`. Restore accepts schema 1 and 2, and migrates legacy `"rolereveal"` to canonical `"roleReveal"`.

Online Mode does not use `werwolf-save` for room state. Room state lives in the server process, and clients store reconnect session tokens locally.
