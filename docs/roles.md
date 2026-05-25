# Roles - Werwolf Master Companion

All roles are defined in `src/constants/roles.ts` and typed via the `Role` interface in `src/types.ts`.

---

## Implementation Notes

- `ROLES` is the runtime source for role metadata, team lookup, and role ID validation.
- `ROLE_IDS` / `ROLE_ID_SET` are derived from `ROLES`; do not maintain a second role list.
- `getTeam(role)` reads team metadata from `ROLES` and safely falls back to `"village"` for malformed runtime values.
- Team classification and team membership checks should use `getTeam()` or effective-team helpers, not hardcoded role ID checks. Role-specific mechanics may still use explicit role checks via `getEffectiveRole()` or direct role IDs where exact identity matters.
- `getEffectiveRole()` / `getEffectiveTeam()` are used where transient effects, such as Urwolf transformation, must be visible before the underlying role mutation is finalized.
- `getRoleDisplay()` in `src/domain/roleDisplay.ts` formats exact-role displays, including converted roles such as `Werwolf (ehem. Verfluchter)`.

---

## Role Type

```ts
interface Role {
  name: string;
  icon: string;
  team: "wolf" | "village";
  cat: "classic" | "special";
  desc: string;
  unique?: boolean;  // if true, max 1 per game
}
```

---

## Classic Roles

### 🐺 Werwolf (Wolf)
- **Team:** Wolf
- **Night:** Wakes with other wolves, votes on a victim.
- **Win:** When wolves ≥ village players alive.
- **Note:** Multiple Werwölfe are supported.

### 🏘️ Dorfbewohner (Village)
- **Team:** Village
- **Night:** Sleeps; no special ability.
- **Win:** When all wolves are dead.
- **Note:** Multiple Dorfbewohner are supported.

### 👁️ Seher (Seer) (*unique*)
- **Team:** Village
- **Night:** Picks one player and learns their exact role.
- **Edge case:** If the Seher inspects the Urwolf's current victim (during the same night the Urwolf is transforming them), `getEffectiveRole()` returns `"werwolf"`. The seer sees the future wolf.

### 🧪 Hexe (Witch) (*unique*)
- **Team:** Village
- **Night:** May use:
  - **Heiltrank** (once per game): saves the wolf's victim from dying.
  - **Gifttrank** (once per game): kills any other player (excluding herself and the wolf victim, except when that victim is a converted Verfluchter or protected by Beschützer).
- **Edge case:** If Urwolf is transforming the victim, the heal option is hidden (the victim won't die anyway).
- **Edge case:** If Beschützer prevents the wolf attack, the heal option is hidden and the heal potion is not spent. The protected wolf target may still be poisoned directly.
- **Win-mode interaction:** In **Erweitert** mode only, a living Hexe who still has at least one potion (heal or poison) delays the wolf-win condition. `checkWin()` will not declare a wolf victory while such a potion remains. In **Standard** mode this check is skipped and wolves win immediately when `wolves ≥ village`.

### 🎯 Jäger (Hunter) (*unique*)
- **Team:** Village
- **On death (any cause):** Triggers a modal where the Hunter may shoot one alive player or pass.
- **Chain deaths:** If the Hunter shoots a player who is also a Hunter (or whose death chains to another Hunter), the trigger queue handles all of them sequentially.
- **Lover chain:** If the Hunter dies and their lover is alive, the lover dies first (lover chain), and if the lover is also a Hunter, two hunter triggers may fire.
- **Win-mode interaction:** In **Erweitert** mode only, a living Jäger delays the wolf-win condition. `checkWin()` will not declare a wolf victory while the Jäger is still alive. In **Standard** mode this check is skipped and wolves win immediately when `wolves ≥ village`.

### 💘 Amor (*unique*)
- **Team:** Village
- **Night 1 only:** Picks two players as lovers. Each stores the other's ID in `player.lover`.
- **Lover death chain:** Whenever a lover dies (for any reason), `killPlayer()` immediately kills the partner.
- **Lovers win condition:** If exactly 2 players are alive and both are lovers, they win together regardless of team (`"lovers"` win reason).
- **Edge case:** Amor can pick themselves as one of the lovers.

---

## Special Roles

### 🃏 Narr (Jester) (*unique*)
- **Team:** Village (but wins alone)
- **Goal:** Get voted out by the village during the day.
- **On day vote:** Triggers immediate `"narr"` win, game ends.
- **Note:** The Narr does NOT trigger normal checkWin. The win is handled before any kill logic.

### 🤡 Dorftrottel (*unique*)
- **Team:** Village (but wins alone)
- **Goal:** Get voted out in **round 1 specifically**.
- **On day vote in round 1:** Triggers immediate `"dorftrottel"` win, game ends.
- **If they survive round 1:** At the start of night 2, their role is changed from `"dorftrottel"` to `"dorfbewohner"` silently. A log message is added: "🤡 {name} hat die erste Runde überlebt und wird zum Dorfbewohner."
- **On day vote after round 1:** Treated as a normal Dorfbewohner elimination (their `role` is already `"dorfbewohner"` by then).

### 🔮 Aura-Seher (Aura Seer) (*unique*)
- **Team:** Village
- **Night:** Picks one player and learns only their **team** (good/evil), not the exact role.
- **Edge case:** Uses `getEffectiveTeam()` which respects in-progress Urwolf transforms.

### 🔍 Detektiv (Detective) (*unique*)
- **Team:** Village
- **Night:** Picks two players and learns whether they are on the **same team** or not.
- **Edge case:** Uses `getEffectiveTeam()` for both picks.

### 🐺 Urwolf (*unique*)
- **Team:** Wolf
- **Night:** Wakes after the wolves. Has a **one-time ability** to transform the wolf victim into a Werwolf instead of killing them.
- **On transform:** `player.role` changes to `"werwolf"`. `player.originalRole` is not touched and remains the victim's original starting role (e.g. `"dorfbewohner"` or `"seher"`). The game-over screen (GameOver component) shows the original role alongside the current role when they differ.
- **On normal kill:** Ability not used; `urwolfUsed` stays false.
- **Once used:** The `urwolf` night step is no longer active (shows inactive placeholder).
- **Edge case:** If the Urwolf is transforming a player, the Hexe's heal option is hidden (nothing to heal). The Seher and Aura-Seher see the target as a wolf (via `getEffectiveRole()`/`getEffectiveTeam()`).
- **Verfluchter edge case:** If the wolf victim was already converted from Verfluchter this night, the Urwolf step still appears when applicable, but the UI blocks the transform choice. `urwolfUsed` remains false, and dawn ignores stale `urwolfTransform` for that target.
- **Beschützer edge case:** If Beschützer protected the wolf victim, the Urwolf step is blocked for that target. `urwolfUsed` remains false, and dawn ignores stale `urwolfTransform` for that target.

### 🛏️ Nachtgast (*unique*)
- **Team:** Village
- **Night:** Wakes before the Werwölfe and chooses one other living player to visit.
- **Wolf attack only:** Nachtgast only changes Werwolf attack resolution. Day vote, Witch poison, Hunter shots, lover deaths, and other direct effects behave normally.
- **Direct wolf attack:** If the Werwölfe attack Nachtgast directly while they are visiting, Nachtgast survives because they are not at home. The Witch gets no heal option for this attack.
- **Host attacked:** If the Werwölfe attack the visited host, the host is the main target and Nachtgast is also hit.
- **Witch interaction:** The healing potion saves only the Werwölfe's main target. If the host is healed, Nachtgast still dies. Poisoning the host does not affect Nachtgast; poisoning Nachtgast directly kills them.
- **Urwolf interaction:** If Urwolf transforms the visited host, the host becomes a Werwolf and Nachtgast is still hit. If Urwolf tries to transform Nachtgast directly while they are away, nothing happens and the one-time ability is not consumed.
- **Verfluchter interaction:** If Nachtgast visits Verfluchter and wolves attack that host, Verfluchter converts and survives, while Nachtgast is still hit.
- **Beschützer interaction:** If Beschützer protects the visited host, the wolf attack is prevented before it hits the location, so both host and Nachtgast survive.

### 🛡️ Beschützer (*unique*)
- **Team:** Village
- **Night:** Wakes every night after Nachtgast and before the Werwölfe.
- **Action:** Chooses one living player to protect for the current night.
- **Restrictions:** Cannot protect themselves and cannot protect the same player two nights in a row.
- **Wolf attack only:** Protection prevents only the Werwölfe's attack. Day vote, Witch poison, Hunter shots, lover deaths, and other non-wolf effects still kill normally.
- **Protected target:** If wolves attack the protected player, no main target dies and no Nachtgast collateral death happens.
- **Verfluchter interaction:** If the protected target is Verfluchter, the wolf attack is prevented before conversion, so Verfluchter stays Verfluchter.
- **Urwolf interaction:** Urwolf cannot transform a protected wolf target, and the one-time ability is not consumed.
- **Witch interaction:** Witch heal is not offered and is not spent because there is no wolf kill to heal. Witch poison can still kill the protected player directly.
- **State:** `beschuetzerTarget` is cleared with per-night state. `beschuetzerLastTarget` stores the previous protected player so the next night can block repeat protection.

### ⛓️ Verfluchter (*unique*)
- **Team:** Village at setup.
- **Night:** No active night action.
- **Wolf attack:** If wolves attack Verfluchter directly, Verfluchter does not die. They immediately become a Werwolf by changing `player.role` to `"werwolf"` while keeping `player.originalRole = "verfluchter"`.
- **Secrecy:** The village is not publicly informed. The GM gets a normal log entry, and Online player clients do not receive logs.
- **Notification step:** After the wolves close their eyes, a GM-only `verfluchter` notification step appears so the GM can quietly inform the converted player.
- **Private role card:** Exact-role views show the converted player as `Werwolf (ehem. Verfluchter)`.
- **Same-night information:** Seher, Aura-Seher, Detektiv, and later wolf-team checks see the converted Verfluchter as wolf-aligned in the same night.
- **Witch interaction:** The Hexe cannot heal this conversion. She may still poison the converted Verfluchter in the same night.
- **Beschützer interaction:** If Verfluchter is protected, the wolf attack is prevented and no conversion happens.
- **Other deaths:** Day vote, Witch poison, Hunter shot, lover chain, and other non-wolf effects kill Verfluchter normally.

### 💪 Harter Bursche (*unique*)
- **Team:** Village
- **Night:** No active night action.
- **Wolf attack:** If wolves attack Harter Bursche directly and the attack is not protected or healed, he does not die right away. He is marked as wounded, secretly informed by the GM, keeps playing through the next day, and dies at the following dawn.
- **GM notification step:** A GM-only `harterbursche` notification step appears right before dawn after the Witch step, because Witch heal can still prevent the wound.
- **Information:** GM sees the wound and informs the player quietly. Player snapshots do not expose the wound state. Wolves only know their chosen target survived.
- **Next night:** Harter Bursche remains alive and selectable for wolves and other roles until the next night resolves. A second wolf attack, protection, or Witch heal in that later night does not prevent the old wound death.
- **Hexe interaction:** Witch sees Harter Bursche as the normal wolf victim. Healing in the original attack night prevents the wound completely. Healing in the following night only protects against a new attack, not the old wound.
- **Beschützer interaction:** If Beschützer protects Harter Bursche in the original attack night, no wound is created.
- **Nachtgast interaction:** If Nachtgast visits Harter Bursche and wolves attack that host, Harter Bursche is wounded while Nachtgast is hit as collateral.
- **Urwolf interaction:** If Urwolf transforms Harter Bursche instead of killing him, no new wound is created. Existing wounds are not removed by later transformations.
- **Other deaths:** Day vote, Witch poison, Hunter shot, lover chain, and other non-wolf effects kill Harter Bursche normally and clear any pending wound.

---

## RoleId Type

```ts
type RoleId =
  | "werwolf" | "dorfbewohner" | "seher" | "hexe" | "jaeger"
  | "amor" | "narr" | "dorftrottel" | "auraseher" | "detektiv" | "urwolf"
  | "nachtgast" | "beschuetzer" | "verfluchter" | "harterbursche";
```

---

## Night Step Conditions

| Role | Night Step Active Condition |
|------|-----------------------------|
| werwolf | Always (`active: true`) |
| amor | `hadRole("amor") && round === 1` |
| nachtgast | `aliveWithRole("nachtgast")` |
| beschuetzer | `aliveWithRole("beschuetzer")` |
| seher | `aliveWithRole("seher")` |
| hexe | `aliveWithRole("hexe") && (!witchHealUsed \|\| !witchPoisonUsed)` |
| jaeger | No night step; triggers on death only |
| auraseher | `aliveWithRole("auraseher")` |
| detektiv | `aliveWithRole("detektiv")` |
| urwolf | `aliveWithRole("urwolf") && !urwolfUsed` |
| narr | No night step |
| dorftrottel | No night step |
| verfluchter | No active night step; GM notification appears only when `verfluchterConvertedThisNight !== null` |
| harterbursche | No active night step; GM notification appears only when `harterBurscheWoundedThisNight !== null` |
