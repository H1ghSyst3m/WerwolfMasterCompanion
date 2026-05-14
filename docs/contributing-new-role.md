# How to Add a New Role

## Checklist

### 1. `src/types.ts` - Role IDs and night step IDs

Add the role to `RoleId`:

```ts
type RoleId =
  | "werwolf"
  | "your-new-role";
```

If the role has a night action, add a `NightStepId`.

### 2. `src/constants/roles.ts` - Role metadata

Add the role to `ROLES`:

```ts
"your-new-role": {
  name: "Your Role Name",
  icon: "🎭",
  team: "wolf" | "village",
  cat: "classic" | "special",
  desc: "Description shown in role info modal.",
  unique: true,
},
```

`ROLES` is also the runtime source for role IDs, team lookup, and websocket role validation. Do not add a separate role list elsewhere.

### 3. `src/logic/nightSteps.ts` - Step order

If the role has a night action, add a step to `buildNightSteps()` using `hadRole()` for step existence and `aliveWithRole()` for active state:

```ts
if (hadRole("your-new-role")) {
  steps.push({
    id: "yournewrole",          // must match a new NightStepId
    title: "Your Role erwacht",
    icon: "🎭",
    desc: "Description of the night action.",
    active: aliveWithRole("your-new-role"),
  });
}
```

Also add the new step ID to the `NightStepId` union in `src/types.ts`:

```ts
type NightStepId =
  | "sleep" | "amor" | ... | "dawn"
  | "yournewrole";
```

### 4. `src/components/night/NightStepYourRole.tsx` - Night action component

Create a component in `src/components/night/` following the existing step pattern.

Receive at minimum:

- `alive`
- `players`
- `advanceNightStep`
- `addLog`
- any role-specific state your role needs

### 5. `NightPhase` wiring

**a) Import the new component:**

```ts
import { NightStepYourRole } from "./NightStepYourRole";
```

**b) Add to `getNightStepPlayers()` roleMap if the role should appear as awake:**

```ts
const roleMap: Partial<Record<NightStepId, RoleId[]>> = {
  ...
  yournewrole: ["your-new-role"],
};
```

**c) Add the conditional render block:**

```tsx
{currentNightStep.active && currentNightStep.id === "yournewrole" && (
  <NightStepYourRole
    alive={alive}
    players={players}
    yourState={yourState}
    setYourState={setYourState}
    addLog={addLog}
    advanceNightStep={advanceNightStep}
  />
)}
```

**d) Add new props to `NightPhaseProps` interface** if the component needs role-specific state or setters.

The wolves step intentionally uses effective team logic, not a hardcoded role list.

### 6. `src/hooks/useNightActions.ts` - Per-night state

Add new state variables for the role's action if the action needs Local Mode state:

```ts
const [yourState, setYourState] = useState<...>(initialValue);
```

Include the state in `resetNightActions()` only if it is per-night and should reset each night.

Do not reset permanent/game-wide flags like `urwolfUsed`, `witchHealUsed`, or `witchPoisonUsed`.

Also add the new state/setter to the `NightActionsHook` interface.

### 7. `src/domain/gameState.ts` and `src/types.ts` - Shared runtime and saves

If Online Mode also needs the state, add it to the shared runtime fields in `src/domain/gameState.ts`.

If Local Mode should persist the state across reloads, add it to `SaveState`:

```ts
interface SaveState {
  ...
  yourState: YourType;
}
```

Then wire it in `src/werwolf-app.tsx`:

```ts
// buildSaveState()
yourState: na.yourState,

// restoreState()
na.setYourState(s.yourState ?? defaultValue);
```

Also pass the new props to `<NightPhase>` and add the state to the autosave effect dependency list.

### 8. Online/server wiring

- Add websocket command validation in `src/online/messages.ts` if the GM sends the state over the wire.
- Add server handling in `server/roomManager.ts` if Online Mode must mutate the state.
- Add the field to reset-to-lobby cleanup if it must clear between games.
- Ensure GM snapshots expose full state only to the GM.
- Ensure player snapshots expose only player-safe information.

### 9. Online Mode behavior

New roles must work in both modes unless intentionally local-only.

Check:

- Server snapshots expose full role data to GM only.
- Player snapshots expose only the player's own role when roles are visible.
- Role assignment and reset-to-lobby clear or preserve the new state correctly.
- Reconnects and stale sessions cannot replay old actions.

### 10. Win and team logic

Use shared helpers instead of duplicating role/team checks.

See [Key Utilities](#key-utilities) for the canonical helper list and locations.

If a role can temporarily change allegiance, pass `getTeamForPlayer` into `checkWin()` at relevant call sites.

After any kill in a new role's logic, call `checkWin(updatedPlayers, opts)` and if a win is detected, set the winner and move the game to `"ended"` in both Local and Online paths.

### 11. Docs and tests

Update:

- `docs/roles.md`
- `docs/game-flow.md`
- `docs/online-mode.md` if Online Mode behavior changes

Add tests for:

- shared rule behavior
- Local Mode save/restore if state is persisted
- server room behavior and role-filtered snapshots for Online Mode

## Key Utilities

| Utility | Location | Description |
|---|---|---|
| `killPlayer(pid, cause, players)` | `src/logic/gameLogic.ts` | Kills a player, handles lover chain and hunter triggers |
| `checkWin(players, opts)` | `src/logic/gameLogic.ts` | Returns win reason or `null`; accepts optional effective-team resolver |
| `getTeam(role)` | `src/logic/gameLogic.ts` | Returns team from `ROLES`, safely defaulting malformed values to `"village"` |
| `getEffectiveRole(playerId)` | `src/werwolf-app.tsx`, `src/online/OnlineGmController.tsx` | Accounts for in-progress Urwolf transform |
| `getEffectiveTeam(playerId)` | `src/werwolf-app.tsx`, `src/online/OnlineGmController.tsx` | Accounts for transient team changes |
| `hadRole(r)` | `useGameState` / server runtime helpers | Use for night step existence |
| `aliveWithRole(r)` | `useGameState` / server runtime helpers | Use for step active state |

## Win Condition Note

After any kill in a new role's logic, run the same win-check path used by the surrounding code. Local Mode should call `checkWin()` with the current options and set `winner` / `phase`. Online Mode should use the server's shared win application path so snapshots and room phase stay consistent.

## Roles Without Night Actions

Roles like Narr and Dorftrottel are handled in day-vote logic and do not need night action state.
