import { describe, expect, it } from "vitest";
import { lockLobby, goToAssignment, updateRoleCounts } from "./roomSetup";
import { createServerRoom, createServerRoomPlayer } from "./roomState";
import { roleCountTotal } from "../src/domain/gameState";
import type { ServerRoom } from "./roomTypes";

function makeRoom(playerCount = 5, phase: ServerRoom["roomPhase"] = "lobby"): ServerRoom {
  const room = createServerRoom("TEST", "host-token", "host-client");
  room.roomPhase = phase;
  for (let i = 0; i < playerCount; i += 1) {
    room.players.push(createServerRoomPlayer(i + 1, `Player ${i + 1}`, `client-${i + 1}`));
  }
  return room;
}

describe("lockLobby", () => {
  it("auto-fills all slots with villagers when roleCounts is empty", () => {
    const room = makeRoom(5);
    room.roleCounts = {};
    lockLobby(room);
    expect(room.roleCounts.dorfbewohner).toBe(5);
    expect(roleCountTotal(room.roleCounts)).toBe(5);
  });

  it("fills remaining slots with villagers after non-villager roles are counted", () => {
    const room = makeRoom(5);
    room.roleCounts = { werwolf: 1 };
    lockLobby(room);
    expect(room.roleCounts).toMatchObject({ werwolf: 1, dorfbewohner: 4 });
    expect(roleCountTotal(room.roleCounts)).toBe(5);
  });

  it("clamps dorfbewohner to 0 when non-villager roles exceed player count", () => {
    const room = makeRoom(5);
    room.roleCounts = { werwolf: 6 };
    lockLobby(room);
    expect(room.roleCounts.dorfbewohner).toBe(0);
    expect(room.roleCounts.werwolf).toBe(6);
  });

  it("sets roomPhase to setup, setupStep to 2, and locked to true", () => {
    const room = makeRoom(5);
    lockLobby(room);
    expect(room.roomPhase).toBe("setup");
    expect(room.setupStep).toBe(2);
    expect(room.locked).toBe(true);
  });

  it("throws when called from an invalid phase", () => {
    const room = makeRoom(5, "setup");
    expect(() => lockLobby(room)).toThrow();
  });

  it("throws when called from playing phase", () => {
    const room = makeRoom(5, "playing");
    expect(() => lockLobby(room)).toThrow();
  });

  it("throws when fewer than 5 players join from lobby", () => {
    const room = makeRoom(4, "lobby");
    expect(() => lockLobby(room)).toThrow();
  });

  it("allows locking from assignment phase (re-locking)", () => {
    const room = makeRoom(5, "assignment");
    expect(() => lockLobby(room)).not.toThrow();
    expect(room.roomPhase).toBe("setup");
  });

  it("preserves multi-role non-villager configuration", () => {
    const room = makeRoom(10);
    room.roleCounts = { werwolf: 2, seher: 1, hexe: 1 };
    lockLobby(room);
    expect(room.roleCounts).toMatchObject({ werwolf: 2, seher: 1, hexe: 1, dorfbewohner: 6 });
    expect(roleCountTotal(room.roleCounts)).toBe(10);
  });

  it("strips any previously set dorfbewohner count and recalculates", () => {
    const room = makeRoom(5);
    room.roleCounts = { werwolf: 1, dorfbewohner: 100 };
    lockLobby(room);
    expect(room.roleCounts.dorfbewohner).toBe(4);
    expect(roleCountTotal(room.roleCounts)).toBe(5);
  });
});

describe("goToAssignment", () => {
  function makeSetupRoom(playerCount = 5): ServerRoom {
    const room = makeRoom(playerCount, "setup");
    return room;
  }

  it("auto-fills villagers so total matches player count", () => {
    const room = makeSetupRoom(5);
    room.roleCounts = { werwolf: 1 };
    goToAssignment(room);
    expect(room.roleCounts).toMatchObject({ werwolf: 1, dorfbewohner: 4 });
  });

  it("sets roomPhase to assignment and setupStep to 3", () => {
    const room = makeSetupRoom(5);
    room.roleCounts = {};
    goToAssignment(room);
    expect(room.roomPhase).toBe("assignment");
    expect(room.setupStep).toBe(3);
  });

  it("resets assignMode to null and manualAssign to empty object", () => {
    const room = makeSetupRoom(5);
    room.roleCounts = {};
    room.assignMode = "random";
    room.manualAssign = { "1": "werwolf" };
    goToAssignment(room);
    expect(room.assignMode).toBeNull();
    expect(room.manualAssign).toEqual({});
  });

  it("succeeds when roles exactly fill all player slots after auto-fill", () => {
    const room = makeSetupRoom(5);
    room.roleCounts = { werwolf: 1, seher: 1 };
    goToAssignment(room);
    expect(roleCountTotal(room.roleCounts)).toBe(5);
  });

  it("throws when non-villager roles exceed player count even after auto-fill", () => {
    const room = makeSetupRoom(3);
    room.roleCounts = { werwolf: 5 };
    expect(() => goToAssignment(room)).toThrow();
  });

  it("throws when not called from setup phase", () => {
    const room = makeRoom(5, "lobby");
    expect(() => goToAssignment(room)).toThrow();
  });

  it("throws when called from assignment phase", () => {
    const room = makeRoom(5, "assignment");
    expect(() => goToAssignment(room)).toThrow();
  });

  it("handles all-villager setup (no non-villager roles)", () => {
    const room = makeSetupRoom(5);
    room.roleCounts = {};
    goToAssignment(room);
    expect(room.roleCounts.dorfbewohner).toBe(5);
    expect(room.roomPhase).toBe("assignment");
  });
});

describe("updateRoleCounts", () => {
  it("applies autoFillVillagers to the payload role counts", () => {
    const room = makeRoom(5, "setup");
    updateRoleCounts(room, { roleCounts: { werwolf: 1 } });
    expect(room.roleCounts).toMatchObject({ werwolf: 1, dorfbewohner: 4 });
    expect(roleCountTotal(room.roleCounts)).toBe(5);
  });

  it("fills all slots with villagers when payload roleCounts is empty", () => {
    const room = makeRoom(5, "setup");
    updateRoleCounts(room, { roleCounts: {} });
    expect(room.roleCounts.dorfbewohner).toBe(5);
    expect(roleCountTotal(room.roleCounts)).toBe(5);
  });

  it("uses empty roleCounts when payload has no roleCounts key", () => {
    const room = makeRoom(5, "setup");
    updateRoleCounts(room, {});
    expect(room.roleCounts.dorfbewohner).toBe(5);
  });

  it("throws a TypeError when payload is null", () => {
    const room = makeRoom(5, "setup");
    expect(() => updateRoleCounts(room, null)).toThrow(TypeError);
  });

  it("strips a manually set dorfbewohner from payload and recalculates", () => {
    const room = makeRoom(5, "setup");
    updateRoleCounts(room, { roleCounts: { werwolf: 1, dorfbewohner: 99 } });
    // dorfbewohner from payload should be ignored; auto-fill sets it to 4
    expect(room.roleCounts.dorfbewohner).toBe(4);
    expect(room.roleCounts.werwolf).toBe(1);
  });

  it("clamps dorfbewohner to 0 when overflow occurs", () => {
    const room = makeRoom(3, "setup");
    updateRoleCounts(room, { roleCounts: { werwolf: 5 } });
    expect(room.roleCounts.dorfbewohner).toBe(0);
    expect(room.roleCounts.werwolf).toBe(5);
  });

  it("uses the actual player count of the room", () => {
    const room = makeRoom(8, "setup");
    updateRoleCounts(room, { roleCounts: { werwolf: 2, seher: 1 } });
    expect(room.roleCounts).toMatchObject({ werwolf: 2, seher: 1, dorfbewohner: 5 });
    expect(roleCountTotal(room.roleCounts)).toBe(8);
  });

  it("removes zero-count non-villager roles from the result", () => {
    const room = makeRoom(5, "setup");
    updateRoleCounts(room, { roleCounts: { werwolf: 0, seher: 1 } });
    expect(room.roleCounts.werwolf).toBeUndefined();
    expect(room.roleCounts.seher).toBe(1);
  });
});
