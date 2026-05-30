import { describe, expect, it, vi } from "vitest";
import { getEffectiveTeamForRoom, RoomManager } from "./roomManager";
import { isClientMessage } from "../src/online/messages";
import {
  assignManualRoles,
  autoFillVillagers,
  buildRolePool,
  nonVillagerRoleTotal,
  roleCountTotal,
} from "../src/domain/gameState";
import { checkWin, getTeam, getUrwolfTransformTarget } from "../src/logic/gameLogic";
import { buildNightSteps } from "../src/logic/nightSteps";
import { ROLES } from "../src/constants/roles";
import type { OnlineGmSnapshot, OnlinePlayerSnapshot, OnlineSession } from "../src/online/messages";
import type { ClientMessage, ServerMessage } from "../src/online/messages";
import type { Player, RoleCounts, RoleId } from "../src/types";

function connected(messages: { message: ServerMessage }[]): OnlineSession {
  const message = messages.find(item => item.message.type === "connected")?.message;
  if (!message || message.type !== "connected") throw new Error("missing connected message");
  return message.session;
}

function latestGmSnapshot(messages: { message: ServerMessage }[]): OnlineGmSnapshot {
  const message = messages.findLast(item => item.message.type === "snapshot" && item.message.snapshot.view === "gm")?.message;
  if (!message || message.type !== "snapshot" || message.snapshot.view !== "gm") throw new Error("missing gm snapshot");
  return message.snapshot;
}

function latestPlayerSnapshot(messages: { message: ServerMessage }[]): OnlinePlayerSnapshot {
  const message = messages.findLast(item => item.message.type === "snapshot" && item.message.snapshot.view === "player")?.message;
  if (!message || message.type !== "snapshot" || message.snapshot.view !== "player") throw new Error("missing player snapshot");
  return message.snapshot;
}

function send(manager: RoomManager, clientId: string, message: ClientMessage) {
  return manager.handle(clientId, message);
}

function createRoomWithPlayers(count = 5) {
  const manager = new RoomManager();
  const gmMessages = send(manager, "gm", { type: "gm:createRoom" });
  const gmSession = connected(gmMessages);
  const playerSessions: OnlineSession[] = [];
  for (let index = 0; index < count; index += 1) {
    const joinMessages = send(manager, `p${index}`, {
      type: "player:joinRoom",
      payload: { roomCode: gmSession.roomCode, name: `Spieler ${index + 1}` },
    });
    playerSessions.push(connected(joinMessages));
  }
  return { manager, gmSession, playerSessions };
}

function nachtgastPlayers(wolfRole: "werwolf" | "urwolf" = "werwolf"): Player[] {
  return [
    { id: 1, name: "Wolf", role: wolfRole, originalRole: wolfRole, alive: true, lover: null },
    { id: 2, name: "Nachtgast", role: "nachtgast", originalRole: "nachtgast", alive: true, lover: null },
    { id: 3, name: "Gastgeber", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
    { id: 4, name: "Dorf 1", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
    { id: 5, name: "Dorf 2", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
  ];
}

function createRoomWithNachtgast(wolfRole: "werwolf" | "urwolf" = "werwolf") {
  const { manager } = createRoomWithPlayers();
  send(manager, "gm", { type: "gm:setPlayers", payload: { players: nachtgastPlayers(wolfRole) } });
  return manager;
}

function verfluchterPlayers(
  wolfRole: "werwolf" | "urwolf" = "werwolf",
  includeNachtgast = false,
): Player[] {
  return [
    { id: 1, name: "Wolf", role: wolfRole, originalRole: wolfRole, alive: true, lover: null },
    { id: 2, name: "Verfluchter", role: "verfluchter", originalRole: "verfluchter", alive: true, lover: null },
    {
      id: 3,
      name: includeNachtgast ? "Nachtgast" : "Hexe",
      role: includeNachtgast ? "nachtgast" : "hexe",
      originalRole: includeNachtgast ? "nachtgast" : "hexe",
      alive: true,
      lover: null,
    },
    {
      id: 4,
      name: includeNachtgast ? "Hexe" : "Seher",
      role: includeNachtgast ? "hexe" : "seher",
      originalRole: includeNachtgast ? "hexe" : "seher",
      alive: true,
      lover: null,
    },
    { id: 5, name: "Dorf", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
  ];
}

function createRoomWithVerfluchter(
  wolfRole: "werwolf" | "urwolf" = "werwolf",
  includeNachtgast = false,
) {
  const { manager } = createRoomWithPlayers();
  send(manager, "gm", { type: "gm:setPlayers", payload: { players: verfluchterPlayers(wolfRole, includeNachtgast) } });
  return manager;
}

function beschuetzerPlayers(
  wolfRole: "werwolf" | "urwolf" = "werwolf",
  targetRole: RoleId = "dorfbewohner",
  includeNachtgast = false,
): Player[] {
  return [
    { id: 1, name: "Wolf", role: wolfRole, originalRole: wolfRole, alive: true, lover: null },
    { id: 2, name: "Beschützer", role: "beschuetzer", originalRole: "beschuetzer", alive: true, lover: null },
    { id: 3, name: targetRole === "verfluchter" ? "Verfluchter" : "Ziel", role: targetRole, originalRole: targetRole, alive: true, lover: null },
    {
      id: 4,
      name: includeNachtgast ? "Nachtgast" : "Hexe",
      role: includeNachtgast ? "nachtgast" : "hexe",
      originalRole: includeNachtgast ? "nachtgast" : "hexe",
      alive: true,
      lover: null,
    },
    { id: 5, name: "Dorf", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
  ];
}

function createRoomWithBeschuetzer(
  wolfRole: "werwolf" | "urwolf" = "werwolf",
  targetRole: RoleId = "dorfbewohner",
  includeNachtgast = false,
) {
  const { manager } = createRoomWithPlayers();
  send(manager, "gm", { type: "gm:setPlayers", payload: { players: beschuetzerPlayers(wolfRole, targetRole, includeNachtgast) } });
  return manager;
}

function harterBurschePlayers(includeNachtgast = false): Player[] {
  return [
    { id: 1, name: "Wolf", role: "werwolf", originalRole: "werwolf", alive: true, lover: null },
    { id: 2, name: "Harter Bursche", role: "harterbursche", originalRole: "harterbursche", alive: true, lover: null },
    {
      id: 3,
      name: includeNachtgast ? "Nachtgast" : "Hexe",
      role: includeNachtgast ? "nachtgast" : "hexe",
      originalRole: includeNachtgast ? "nachtgast" : "hexe",
      alive: true,
      lover: null,
    },
    { id: 4, name: "Dorf 1", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
    { id: 5, name: "Dorf 2", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
  ];
}

function createRoomWithHarterBursche(includeNachtgast = false) {
  const { manager } = createRoomWithPlayers();
  send(manager, "gm", { type: "gm:setPlayers", payload: { players: harterBurschePlayers(includeNachtgast) } });
  return manager;
}

function wildesKindPlayers(overrides: Partial<Record<number, Partial<Player>>> = {}): Player[] {
  const players = [
    { id: 1, name: "Wolf", role: "werwolf", originalRole: "werwolf", alive: true, lover: null },
    { id: 2, name: "Wildes Kind", role: "wildeskind", originalRole: "wildeskind", alive: true, lover: null },
    { id: 3, name: "Vorbild", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
    { id: 4, name: "Dorf 1", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
    { id: 5, name: "Dorf 2", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
  ] satisfies Player[];
  return players.map(player => ({ ...player, ...overrides[player.id] }));
}

function createRoomWithWildesKind(overrides: Partial<Record<number, Partial<Player>>> = {}) {
  const { manager } = createRoomWithPlayers();
  send(manager, "gm", { type: "gm:setPlayers", payload: { players: wildesKindPlayers(overrides) } });
  send(manager, "gm", { type: "gm:updateNightAction", payload: { wildesKindVorbild: 3 } });
  return manager;
}

function advanceFromSleepToWolves(manager: RoomManager): void {
  send(manager, "gm", { type: "gm:advanceNightStep" });
}

function convertVerfluchterByWolfAttack(manager: RoomManager): OnlineGmSnapshot {
  advanceFromSleepToWolves(manager);
  send(manager, "gm", { type: "gm:updateNightAction", payload: { nightVictim: 2 } });
  return latestGmSnapshot(send(manager, "gm", { type: "gm:advanceNightStep" }));
}

describe("RoomManager", () => {
  it("locks the lobby and rejects new players after setup starts", () => {
    const { manager, gmSession } = createRoomWithPlayers();
    const lockMessages = send(manager, "gm", { type: "gm:lockLobby" });
    expect(latestGmSnapshot(lockMessages).locked).toBe(true);
    expect(latestGmSnapshot(lockMessages).roomPhase).toBe("setup");

    const rejected = send(manager, "late", {
      type: "player:joinRoom",
      payload: { roomCode: gmSession.roomCode, name: "Zu spät" },
    });
    expect(rejected[0]?.message.type).toBe("error");
  });

  it("auto-fills villagers when role setup starts", () => {
    const { manager } = createRoomWithPlayers();

    const preLock = latestGmSnapshot(send(manager, "gm", { type: "gm:setPrefs", payload: {} }));
    expect(preLock.roleCounts.dorfbewohner).toBe(0);
    expect(roleCountTotal(preLock.roleCounts)).toBe(0);

    const snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:lockLobby" }));

    expect(snapshot.roleCounts.dorfbewohner).toBe(5);
    expect(roleCountTotal(snapshot.roleCounts)).toBe(5);
  });

  it("keeps villagers as remaining role slots when role counts change", () => {
    const { manager } = createRoomWithPlayers();
    send(manager, "gm", { type: "gm:lockLobby" });

    const updated = latestGmSnapshot(send(manager, "gm", {
      type: "gm:updateRoleCounts",
      payload: { roleCounts: { werwolf: 1 } },
    }));

    expect(updated.roleCounts).toMatchObject({ werwolf: 1, dorfbewohner: 4 });

    const assignment = latestGmSnapshot(send(manager, "gm", { type: "gm:goToAssignment" }));
    expect(assignment.roomPhase).toBe("assignment");
    expect(assignment.roleCounts).toMatchObject({ werwolf: 1, dorfbewohner: 4 });
  });

  it("filters player snapshots so players only receive their own assigned role", () => {
    const { manager, gmSession, playerSessions } = createRoomWithPlayers();
    send(manager, "gm", { type: "gm:lockLobby" });
    const roleCounts: RoleCounts = { werwolf: 1, dorfbewohner: 4 };
    send(manager, "gm", { type: "gm:updateRoleCounts", payload: { roleCounts } });
    send(manager, "gm", { type: "gm:goToAssignment" });
    send(manager, "gm", { type: "gm:setAssignMode", payload: { assignMode: "manual" } });
    send(manager, "gm", {
      type: "gm:setManualAssign",
      payload: {
        manualAssign: {
          "1": "werwolf",
          "2": "dorfbewohner",
          "3": "dorfbewohner",
          "4": "dorfbewohner",
          "5": "dorfbewohner",
        },
      },
    });
    const startMessages = send(manager, "gm", { type: "gm:startGame" });
    const gmSnapshot = latestGmSnapshot(startMessages);
    expect(gmSnapshot.players[0]?.role).toBe("werwolf");
    expect(gmSnapshot.roomPhase).toBe("roleReveal");

    const resumeMessages = send(manager, "p2-reconnect", {
      type: "resume",
      payload: { roomCode: gmSession.roomCode, clientToken: playerSessions[1]!.clientToken },
    });
    const playerSnapshot = latestPlayerSnapshot(resumeMessages);
    expect(playerSnapshot.player?.role).toBe("dorfbewohner");
    expect(playerSnapshot.players.every(player => !("role" in player))).toBe(true);
  });

  it("rejects starting the game outside assignment", () => {
    const { manager } = createRoomWithPlayers();
    const rejected = send(manager, "gm", { type: "gm:startGame" });
    expect(rejected[0]?.message.type).toBe("error");
  });

  it("rejects starting the game without players", () => {
    const manager = new RoomManager();
    send(manager, "gm", { type: "gm:createRoom" });
    send(manager, "gm", { type: "gm:lockLobby" });
    send(manager, "gm", { type: "gm:goToAssignment" });

    const rejected = send(manager, "gm", { type: "gm:startGame" });
    expect(rejected[0]?.message.type).toBe("error");
  });

  it("rejects invalid GM phase transitions", () => {
    const { manager } = createRoomWithPlayers();

    expect(send(manager, "gm", { type: "gm:unlockLobby" })[0]?.message.type).toBe("error");
    expect(send(manager, "gm", { type: "gm:goToAssignment" })[0]?.message.type).toBe("error");
    expect(send(manager, "gm", { type: "gm:startFirstNight" })[0]?.message.type).toBe("error");
  });

  it("unlocks setup by resetting runtime state back to lobby", () => {
    const { manager } = createRoomWithPlayers();
    send(manager, "gm", { type: "gm:lockLobby" });
    send(manager, "gm", {
      type: "gm:setPlayers",
      payload: {
        players: [
          { id: 1, name: "Spieler 1", role: "werwolf", originalRole: "werwolf", alive: false, lover: null },
          { id: 2, name: "Spieler 2", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
          { id: 3, name: "Spieler 3", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
          { id: 4, name: "Spieler 4", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
          { id: 5, name: "Spieler 5", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
        ] satisfies Player[],
      },
    });

    const snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:unlockLobby" }));

    expect(snapshot.roomPhase).toBe("lobby");
    expect(snapshot.locked).toBe(false);
    expect(snapshot.players.every(player => player.role === null && player.alive)).toBe(true);
    expect(snapshot.round).toBe(1);
    expect(snapshot.timerRunning).toBe(false);
  });

  it("resets a finished room back to lobby with existing players connected", () => {
    const { manager } = createRoomWithPlayers();
    send(manager, "gm", {
      type: "gm:setPlayers",
      payload: {
        players: [
          { id: 1, name: "Spieler 1", role: "narr", originalRole: "narr", alive: true, lover: null },
          { id: 2, name: "Spieler 2", role: "werwolf", originalRole: "werwolf", alive: true, lover: null },
          { id: 3, name: "Spieler 3", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
          { id: 4, name: "Spieler 4", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
          { id: 5, name: "Spieler 5", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
        ] satisfies Player[],
      },
    });
    send(manager, "gm", { type: "gm:startFirstNight" });
    send(manager, "gm", { type: "gm:startDay" });
    const endedSnapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:dayVote", payload: { playerId: 1 } }));
    expect(endedSnapshot.roomPhase).toBe("ended");

    const resetMessages = send(manager, "gm", { type: "gm:resetToLobby" });
    const snapshot = latestGmSnapshot(resetMessages);
    expect(snapshot.roomPhase).toBe("lobby");
    expect(snapshot.locked).toBe(false);
    expect(snapshot.players).toHaveLength(5);
    expect(snapshot.players.every(player => player.role === null && player.alive)).toBe(true);
  });

  it("cancels a running room back to lobby while preserving reconnect tokens", () => {
    const { manager, gmSession, playerSessions } = createRoomWithPlayers();
    const roleCounts: RoleCounts = { werwolf: 1, dorfbewohner: 4 };
    send(manager, "gm", { type: "gm:lockLobby" });
    send(manager, "gm", { type: "gm:updateRoleCounts", payload: { roleCounts } });
    send(manager, "gm", { type: "gm:goToAssignment" });
    send(manager, "gm", { type: "gm:setAssignMode", payload: { assignMode: "manual" } });
    send(manager, "gm", {
      type: "gm:setManualAssign",
      payload: {
        manualAssign: {
          "1": "werwolf",
          "2": "dorfbewohner",
          "3": "dorfbewohner",
          "4": "dorfbewohner",
          "5": "dorfbewohner",
        },
      },
    });
    send(manager, "gm", { type: "gm:startGame" });
    send(manager, "gm", { type: "gm:startFirstNight" });
    send(manager, "gm", { type: "gm:updateNightAction", payload: { nightVictim: 2 } });
    send(manager, "gm", { type: "gm:addLog", payload: { text: "Testeintrag" } });

    const resetMessages = send(manager, "gm", { type: "gm:resetToLobby" });
    const snapshot = latestGmSnapshot(resetMessages);
    expect(snapshot.roomPhase).toBe("lobby");
    expect(snapshot.locked).toBe(false);
    expect(snapshot.players).toHaveLength(5);
    expect(snapshot.players.every(player => player.role === null && player.originalRole === null && player.alive)).toBe(true);
    expect(snapshot.log).toEqual([]);
    expect(snapshot.nightVictim).toBeNull();

    const resumedPlayer = connected(send(manager, "p0-new", {
      type: "resume",
      payload: { roomCode: gmSession.roomCode, clientToken: playerSessions[0]!.clientToken },
    }));
    expect(resumedPlayer.role).toBe("player");
  });

  it("transfers the GM role to a connected player and removes them from the player list", () => {
    const { manager } = createRoomWithPlayers();
    const transferMessages = send(manager, "gm", { type: "gm:transferHost", payload: { playerId: 1 } });
    const promoted = transferMessages.find(message => message.clientId === "p0" && message.message.type === "connected")?.message;
    expect(promoted?.type).toBe("connected");
    if (promoted?.type === "connected") expect(promoted.session.role).toBe("gm");
    const snapshot = latestGmSnapshot(transferMessages);
    expect(snapshot.players.map(player => player.name)).not.toContain("Spieler 1");
    expect(transferMessages.some(message => message.clientId === "gm" && message.message.type === "hostTransferred")).toBe(true);
  });

  it("closes a lobby for all connected clients and invalidates reconnect tokens", () => {
    const { manager, gmSession, playerSessions } = createRoomWithPlayers();

    const closeMessages = send(manager, "gm", { type: "gm:closeRoom" });

    expect(manager.getRoomCount()).toBe(0);
    expect(closeMessages).toHaveLength(6);
    expect(closeMessages.every(message => message.message.type === "roomClosed")).toBe(true);
    expect(closeMessages.map(message => message.clientId)).toEqual(expect.arrayContaining(["gm", "p0", "p1", "p2", "p3", "p4"]));

    const oldPlayerResume = send(manager, "p0-new", {
      type: "resume",
      payload: { roomCode: gmSession.roomCode, clientToken: playerSessions[0]!.clientToken },
    });
    expect(oldPlayerResume[0]?.message.type).toBe("error");

    const oldGmAction = send(manager, "gm", { type: "gm:lockLobby" });
    expect(oldGmAction[0]?.message.type).toBe("error");
  });

  it("rejects closing a room from players and outside the lobby", () => {
    const { manager } = createRoomWithPlayers();

    const playerClose = send(manager, "p0", { type: "gm:closeRoom" });
    expect(playerClose[0]?.message.type).toBe("error");

    send(manager, "gm", { type: "gm:lockLobby" });
    const gmCloseAfterSetup = send(manager, "gm", { type: "gm:closeRoom" });
    expect(gmCloseAfterSetup[0]?.message.type).toBe("error");
  });

  it("lets the GM kick connected and offline players in the lobby", () => {
    const { manager } = createRoomWithPlayers();
    const connectedKick = send(manager, "gm", { type: "gm:kickPlayer", payload: { playerId: 1 } });
    expect(connectedKick.some(message => message.clientId === "p0" && message.message.type === "kicked")).toBe(true);
    expect(latestGmSnapshot(connectedKick).players.map(player => player.name)).not.toContain("Spieler 1");

    manager.disconnect("p1");
    const offlineKick = send(manager, "gm", { type: "gm:kickPlayer", payload: { playerId: 2 } });
    expect(latestGmSnapshot(offlineKick).players.map(player => player.name)).not.toContain("Spieler 2");
    const offlineJoin = send(manager, "p1-new", {
      type: "player:joinRoom",
      payload: { roomCode: latestGmSnapshot(offlineKick).roomCode, name: "Spieler 2" },
    });
    expect(connected(offlineJoin).role).toBe("player");
  });

  it("rejects kicking outside the lobby", () => {
    const { manager } = createRoomWithPlayers();
    send(manager, "gm", { type: "gm:lockLobby" });
    const rejected = send(manager, "gm", { type: "gm:kickPlayer", payload: { playerId: 1 } });
    expect(rejected[0]?.message.type).toBe("error");
  });

  it("removes lobby players when they switch rooms and frees their name", () => {
    const { manager, gmSession } = createRoomWithPlayers();
    const leaveMessages = send(manager, "p0", { type: "player:leaveRoom" });
    expect(leaveMessages.some(message => message.clientId === "p0" && message.message.type === "leftRoom")).toBe(true);
    expect(latestGmSnapshot(leaveMessages).players.map(player => player.name)).not.toContain("Spieler 1");

    const rejoinMessages = send(manager, "p0-new", {
      type: "player:joinRoom",
      payload: { roomCode: gmSession.roomCode, name: "Spieler 1" },
    });
    expect(connected(rejoinMessages).role).toBe("player");
  });

  it("marks dead players offline when they switch rooms outside the lobby", () => {
    const { manager } = createRoomWithPlayers();
    send(manager, "gm", { type: "gm:lockLobby" });
    const roomSnapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:setPlayers", payload: {
      players: [
        { id: 1, name: "Spieler 1", role: "dorfbewohner", originalRole: "dorfbewohner", alive: false, lover: null },
        { id: 2, name: "Spieler 2", role: "werwolf", originalRole: "werwolf", alive: true, lover: null },
        { id: 3, name: "Spieler 3", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
        { id: 4, name: "Spieler 4", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
        { id: 5, name: "Spieler 5", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
      ] satisfies Player[],
    } }));
    expect(roomSnapshot.roomPhase).toBe("setup");

    const leaveMessages = send(manager, "p0", { type: "player:leaveRoom" });
    const snapshot = latestGmSnapshot(leaveMessages);
    expect(snapshot.players).toHaveLength(5);
    expect(snapshot.players.find(player => player.id === 1)?.connected).toBe(false);
    expect(leaveMessages.some(message => message.clientId === "p0" && message.message.type === "leftRoom")).toBe(true);
  });

  it("rejects room switching for alive players after the lobby is locked", () => {
    const { manager } = createRoomWithPlayers();
    send(manager, "gm", { type: "gm:lockLobby" });
    const rejected = send(manager, "p0", { type: "player:leaveRoom" });
    expect(rejected[0]?.message.type).toBe("error");
  });

  it("rejects assigning alive players to another room after the lobby is locked", () => {
    const { manager } = createRoomWithPlayers();
    send(manager, "gm", { type: "gm:lockLobby" });

    const rejected = send(manager, "p0", { type: "gm:createRoom" });

    expect(rejected[0]?.message.type).toBe("error");
  });

  it("reclaims an offline player slot by same name while still in the lobby", () => {
    const { manager, gmSession } = createRoomWithPlayers();
    manager.disconnect("p0");
    const rejoinMessages = send(manager, "p0-new", {
      type: "player:joinRoom",
      payload: { roomCode: gmSession.roomCode, name: "Spieler 1" },
    });
    expect(connected(rejoinMessages).role).toBe("player");
    const snapshot = latestGmSnapshot(rejoinMessages);
    expect(snapshot.players).toHaveLength(5);
    expect(snapshot.players.find(player => player.name === "Spieler 1")?.connected).toBe(true);
  });

  it("advances nextPlayerId after replacing players", () => {
    const { manager, gmSession } = createRoomWithPlayers();
    send(manager, "gm", {
      type: "gm:setPlayers",
      payload: {
        players: [
          { id: 10, name: "Spieler 10", role: null, originalRole: null, alive: true, lover: null },
        ] satisfies Player[],
      },
    });

    const joinMessages = send(manager, "new-player", {
      type: "player:joinRoom",
      payload: { roomCode: gmSession.roomCode, name: "Neu" },
    });

    expect(latestGmSnapshot(joinMessages).players.map(player => player.id)).toEqual([10, 11]);
  });

  it("rejects stale player actions after the player reconnects from another socket", () => {
    const { manager, gmSession, playerSessions } = createRoomWithPlayers();
    const reconnectMessages = send(manager, "p0-new", {
      type: "resume",
      payload: { roomCode: gmSession.roomCode, clientToken: playerSessions[0]!.clientToken },
    });
    expect(connected(reconnectMessages).role).toBe("player");

    const staleMessages = send(manager, "p0", { type: "player:leaveRoom" });
    expect(staleMessages[0]?.message.type).toBe("error");
  });

  it("detaches a client from the previous room before assigning it to a new room", () => {
    const { manager } = createRoomWithPlayers();
    const createMessages = send(manager, "p0", { type: "gm:createRoom" });
    const oldRoomSnapshot = createMessages.find(
      message => message.clientId === "gm" && message.message.type === "snapshot" && message.message.snapshot.view === "gm",
    )?.message;
    expect(oldRoomSnapshot?.type).toBe("snapshot");
    if (oldRoomSnapshot?.type === "snapshot" && oldRoomSnapshot.snapshot.view === "gm") {
      expect(oldRoomSnapshot.snapshot.players.find(player => player.id === 1)?.connected).toBe(false);
    }
  });

  it("keeps night deaths visible after startDay and clears them when the next night starts", () => {
    const { manager } = createRoomWithPlayers();
    send(manager, "gm", {
      type: "gm:setPlayers",
      payload: {
        players: [
          { id: 1, name: "Spieler 1", role: "werwolf", originalRole: "werwolf", alive: true, lover: null },
          { id: 2, name: "Spieler 2", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
          { id: 3, name: "Spieler 3", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
          { id: 4, name: "Spieler 4", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
          { id: 5, name: "Spieler 5", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
        ] satisfies Player[],
      },
    });
    send(manager, "gm", { type: "gm:updateNightAction", payload: { nightVictim: 2 } });
    send(manager, "gm", { type: "gm:resolveNight" });

    const daySnapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:startDay" }));
    expect(daySnapshot.dayDeaths.map(player => player.name)).toEqual(["Spieler 2"]);
    expect(daySnapshot.dayDeaths[0]).not.toHaveProperty("token");
    expect(daySnapshot.dayDeaths[0]).not.toHaveProperty("clientId");
    expect(daySnapshot.dayDeaths[0]).not.toHaveProperty("connected");
    expect(daySnapshot.dayDeaths[0]).not.toHaveProperty("roleRevealed");

    const nightSnapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:startNight" }));
    expect(nightSnapshot.dayDeaths).toEqual([]);
  });

  it("resolves unresolved night actions before starting the day", () => {
    const { manager } = createRoomWithPlayers();
    send(manager, "gm", {
      type: "gm:setPlayers",
      payload: {
        players: [
          { id: 1, name: "Spieler 1", role: "werwolf", originalRole: "werwolf", alive: true, lover: null },
          { id: 2, name: "Spieler 2", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
          { id: 3, name: "Spieler 3", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
          { id: 4, name: "Spieler 4", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
          { id: 5, name: "Spieler 5", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
        ] satisfies Player[],
      },
    });
    send(manager, "gm", { type: "gm:updateNightAction", payload: { nightVictim: 2 } });

    const daySnapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:startDay" }));

    expect(daySnapshot.players.find(player => player.id === 2)?.alive).toBe(false);
    expect(daySnapshot.dayDeaths.map(player => player.name)).toEqual(["Spieler 2"]);
    expect(daySnapshot.nightVictim).toBeNull();
  });

  it("does not start the day while night trigger fallout is pending", () => {
    const { manager } = createRoomWithPlayers();
    send(manager, "gm", {
      type: "gm:setPlayers",
      payload: {
        players: [
          { id: 1, name: "Spieler 1", role: "werwolf", originalRole: "werwolf", alive: true, lover: null },
          { id: 2, name: "Spieler 2", role: "jaeger", originalRole: "jaeger", alive: true, lover: null },
          { id: 3, name: "Spieler 3", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
          { id: 4, name: "Spieler 4", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
          { id: 5, name: "Spieler 5", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
        ] satisfies Player[],
      },
    });
    send(manager, "gm", { type: "gm:updateNightAction", payload: { nightVictim: 2 } });

    const rejected = send(manager, "gm", { type: "gm:startDay" });
    expect(rejected[0]?.message.type).toBe("error");

    send(manager, "gm", { type: "gm:resolveHunter", payload: { targetId: null } });
    const daySnapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:startDay" }));
    expect(daySnapshot.gamePhase).toBe("day");
    expect(daySnapshot.dayDeaths.map(player => player.name)).toEqual(["Spieler 2"]);
  });

  it("builds the Nachtgast step before the wolves", () => {
    const steps = buildNightSteps({
      round: 1,
      urwolfUsed: false,
      witchHealUsed: false,
      witchPoisonUsed: false,
      verfluchterConvertedThisNight: null,
      hadRole: roleId => roleId === "amor" || roleId === "nachtgast" || roleId === "beschuetzer" || roleId === "urwolf",
      aliveWithRole: roleId => roleId === "amor" || roleId === "nachtgast" || roleId === "beschuetzer" || roleId === "urwolf",
      amorPick: [2, 3],
    });

    expect(steps.map(step => step.id)).toEqual(["sleep", "amor", "lovers", "nachtgast", "beschuetzer", "wolves", "urwolf", "dawn"]);
  });

  it("builds the Wildes Kind step only in round 1 after Amor", () => {
    const baseParams = {
      urwolfUsed: false,
      witchHealUsed: false,
      witchPoisonUsed: false,
      verfluchterConvertedThisNight: null,
      hadRole: (roleId: RoleId) =>
        roleId === "amor" ||
        roleId === "wildeskind" ||
        roleId === "nachtgast" ||
        roleId === "beschuetzer" ||
        roleId === "urwolf",
      aliveWithRole: (roleId: RoleId) =>
        roleId === "amor" ||
        roleId === "wildeskind" ||
        roleId === "nachtgast" ||
        roleId === "beschuetzer" ||
        roleId === "urwolf",
      amorPick: [2, 3],
    };

    expect(buildNightSteps({ ...baseParams, round: 1 }).map(step => step.id))
      .toEqual(["sleep", "amor", "lovers", "wildeskind", "nachtgast", "beschuetzer", "wolves", "urwolf", "dawn"]);
    expect(buildNightSteps({ ...baseParams, round: 2 }).map(step => step.id))
      .toEqual(["sleep", "nachtgast", "beschuetzer", "wolves", "urwolf", "dawn"]);
  });

  it("adds the Verfluchter notification only after conversion", () => {
    const baseParams = {
      round: 1,
      urwolfUsed: false,
      witchHealUsed: false,
      witchPoisonUsed: false,
      hadRole: (roleId: RoleId) => roleId === "verfluchter" || roleId === "urwolf",
      aliveWithRole: (roleId: RoleId) => roleId === "verfluchter" || roleId === "urwolf",
      amorPick: [],
    };

    expect(buildNightSteps({ ...baseParams, verfluchterConvertedThisNight: null }).map(step => step.id))
      .toEqual(["sleep", "wolves", "urwolf", "dawn"]);
    expect(buildNightSteps({ ...baseParams, verfluchterConvertedThisNight: 2 }).map(step => step.id))
      .toEqual(["sleep", "wolves", "verfluchter", "urwolf", "dawn"]);
  });

  it("adds the Urwolf transform notification directly after a successful transform", () => {
    const baseParams = {
      round: 1,
      urwolfUsed: false,
      witchHealUsed: false,
      witchPoisonUsed: false,
      verfluchterConvertedThisNight: null,
      hadRole: (roleId: RoleId) => roleId === "urwolf" || roleId === "seher",
      aliveWithRole: (roleId: RoleId) => roleId === "urwolf" || roleId === "seher",
      amorPick: [],
    };

    expect(buildNightSteps({ ...baseParams, urwolfTransformTarget: null }).map(step => step.id))
      .toEqual(["sleep", "wolves", "urwolf", "seer", "dawn"]);
    expect(buildNightSteps({ ...baseParams, urwolfTransformTarget: 3 }).map(step => step.id))
      .toEqual(["sleep", "wolves", "urwolf", "urwolfinfo", "seer", "dawn"]);
  });

  it("applies an Urwolf transform override while advancing online night steps", () => {
    const { manager } = createRoomWithPlayers();
    send(manager, "gm", {
      type: "gm:setPlayers",
      payload: {
        players: [
          { id: 1, name: "Urwolf", role: "urwolf", originalRole: "urwolf", alive: true, lover: null },
          { id: 2, name: "Ziel", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
          { id: 3, name: "Seher", role: "seher", originalRole: "seher", alive: true, lover: null },
          { id: 4, name: "Dorf 1", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
          { id: 5, name: "Dorf 2", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
        ] satisfies Player[],
      },
    });
    send(manager, "gm", { type: "gm:advanceNightStep" });
    send(manager, "gm", { type: "gm:updateNightAction", payload: { nightVictim: 2 } });
    send(manager, "gm", { type: "gm:advanceNightStep" });

    const snapshot = latestGmSnapshot(send(manager, "gm", {
      type: "gm:advanceNightStep",
      payload: { urwolfTransform: true },
    }));
    const urwolfTransformTarget = getUrwolfTransformTarget(snapshot.players, {
      nightVictim: snapshot.nightVictim,
      nachtgastTarget: snapshot.nachtgastTarget,
      beschuetzerTarget: snapshot.beschuetzerTarget,
      verfluchterConvertedThisNight: snapshot.verfluchterConvertedThisNight,
      urwolfTransform: snapshot.urwolfTransform,
    })?.id ?? null;
    const steps = buildNightSteps({
      round: snapshot.round,
      urwolfUsed: snapshot.urwolfUsed,
      witchHealUsed: snapshot.witchHealUsed,
      witchPoisonUsed: snapshot.witchPoisonUsed,
      verfluchterConvertedThisNight: snapshot.verfluchterConvertedThisNight,
      urwolfTransformTarget,
      harterBurscheWoundedThisNight: snapshot.harterBurscheWoundedThisNight,
      hadRole: roleId => snapshot.players.some(player => player.originalRole === roleId),
      aliveWithRole: roleId => snapshot.players.some(player => player.alive && player.role === roleId),
      amorPick: snapshot.amorPick,
    });

    expect(snapshot.urwolfTransform).toBe(true);
    expect(steps[snapshot.nightStepIdx]?.id).toBe("urwolfinfo");
  });

  it("only exposes successful Urwolf transforms as notification targets", () => {
    const players = nachtgastPlayers("urwolf");

    expect(getUrwolfTransformTarget(players, {
      nightVictim: 3,
      nachtgastTarget: null,
      beschuetzerTarget: null,
      verfluchterConvertedThisNight: null,
      urwolfTransform: true,
    })?.id).toBe(3);
    expect(getUrwolfTransformTarget(players, {
      nightVictim: 3,
      nachtgastTarget: null,
      beschuetzerTarget: null,
      verfluchterConvertedThisNight: null,
      urwolfTransform: false,
    })).toBeNull();
    expect(getUrwolfTransformTarget(players, {
      nightVictim: 3,
      nachtgastTarget: null,
      beschuetzerTarget: 3,
      verfluchterConvertedThisNight: null,
      urwolfTransform: true,
    })).toBeNull();
    expect(getUrwolfTransformTarget(players, {
      nightVictim: 2,
      nachtgastTarget: 3,
      beschuetzerTarget: null,
      verfluchterConvertedThisNight: null,
      urwolfTransform: true,
    })).toBeNull();
    expect(getUrwolfTransformTarget(verfluchterPlayers("urwolf"), {
      nightVictim: 2,
      nachtgastTarget: null,
      beschuetzerTarget: null,
      verfluchterConvertedThisNight: 2,
      urwolfTransform: true,
    })).toBeNull();
  });

  it("only accepts valid Wildes Kind role models and keeps player snapshots private", () => {
    const { manager } = createRoomWithPlayers();
    send(manager, "gm", { type: "gm:setPlayers", payload: { players: wildesKindPlayers({ 5: { alive: false } }) } });

    const messages = send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { wildesKindVorbild: 3 },
    });
    let snapshot = latestGmSnapshot(messages);
    expect(snapshot.wildesKindVorbild).toBe(3);
    expect(latestPlayerSnapshot(messages)).not.toHaveProperty("wildesKindVorbild");

    snapshot = latestGmSnapshot(send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { wildesKindVorbild: null },
    }));
    expect(snapshot.wildesKindVorbild).toBeNull();

    snapshot = latestGmSnapshot(send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { wildesKindVorbild: 3 },
    }));
    expect(snapshot.wildesKindVorbild).toBe(3);

    snapshot = latestGmSnapshot(send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { wildesKindVorbild: 2 },
    }));
    expect(snapshot.wildesKindVorbild).toBe(3);

    snapshot = latestGmSnapshot(send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { wildesKindVorbild: 5 },
    }));
    expect(snapshot.wildesKindVorbild).toBe(3);

    snapshot = latestGmSnapshot(send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { wildesKindVorbild: 99 },
    }));
    expect(snapshot.wildesKindVorbild).toBe(3);
  });

  it("converts Wildes Kind when the role model dies in the night report", () => {
    const manager = createRoomWithWildesKind();
    send(manager, "gm", { type: "gm:updateNightAction", payload: { nightVictim: 3 } });

    const messages = send(manager, "gm", { type: "gm:resolveNight" });
    const snapshot = latestGmSnapshot(messages);
    const wildesKind = snapshot.players.find(player => player.id === 2);
    const playerMessage = messages.find(
      message => message.clientId === "p1" && message.message.type === "snapshot" && message.message.snapshot.view === "player",
    )?.message;

    expect(wildesKind?.role).toBe("werwolf");
    expect(wildesKind?.originalRole).toBe("wildeskind");
    expect(wildesKind?.alive).toBe(true);
    expect(snapshot.dayDeaths.map(player => player.name)).toEqual(["Vorbild"]);
    expect(snapshot.log.map(entry => entry.text)).toContain("🌿 Wildes Kind verliert sein Vorbild und wird heimlich zum Werwolf.");
    if (playerMessage?.type === "snapshot" && playerMessage.snapshot.view === "player") {
      expect(playerMessage.snapshot.player?.role).toBe("werwolf");
      expect(playerMessage.snapshot).not.toHaveProperty("log");
    }
  });

  it("does not convert Wildes Kind when the role model survives a prevented wolf attack", () => {
    const protectedManager = createRoomWithWildesKind({
      4: { role: "beschuetzer", originalRole: "beschuetzer" },
    });
    send(protectedManager, "gm", {
      type: "gm:updateNightAction",
      payload: { beschuetzerTarget: 3, nightVictim: 3 },
    });

    let snapshot = latestGmSnapshot(send(protectedManager, "gm", { type: "gm:resolveNight" }));
    expect(snapshot.players.find(player => player.id === 2)?.role).toBe("wildeskind");
    expect(snapshot.players.find(player => player.id === 3)?.alive).toBe(true);
    expect(snapshot.dayDeaths).toEqual([]);

    const healedManager = createRoomWithWildesKind({
      4: { role: "hexe", originalRole: "hexe" },
    });
    send(healedManager, "gm", {
      type: "gm:updateNightAction",
      payload: { nightVictim: 3, witchHealThisRound: true },
    });

    snapshot = latestGmSnapshot(send(healedManager, "gm", { type: "gm:resolveNight" }));
    expect(snapshot.players.find(player => player.id === 2)?.role).toBe("wildeskind");
    expect(snapshot.players.find(player => player.id === 3)?.alive).toBe(true);
    expect(snapshot.dayDeaths).toEqual([]);
    expect(snapshot.witchHealUsed).toBe(true);
  });

  it("converts Wildes Kind only after Witch poison is resolved", () => {
    const manager = createRoomWithWildesKind({
      4: { role: "hexe", originalRole: "hexe" },
    });

    let snapshot = latestGmSnapshot(send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { witchPoisonTarget: 3 },
    }));
    expect(snapshot.players.find(player => player.id === 2)?.role).toBe("wildeskind");
    expect(snapshot.players.find(player => player.id === 3)?.alive).toBe(true);

    snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:resolveNight" }));
    expect(snapshot.players.find(player => player.id === 2)?.role).toBe("werwolf");
    expect(snapshot.players.find(player => player.id === 3)?.alive).toBe(false);
    expect(snapshot.witchPoisonUsed).toBe(true);
  });

  it("converts Wildes Kind after the role model is eliminated by day vote", () => {
    const manager = createRoomWithWildesKind();

    const snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:dayVote", payload: { playerId: 3 } }));

    expect(snapshot.players.find(player => player.id === 2)?.role).toBe("werwolf");
    expect(snapshot.players.find(player => player.id === 2)?.originalRole).toBe("wildeskind");
    expect(snapshot.players.find(player => player.id === 3)?.alive).toBe(false);
  });

  it("converts Wildes Kind after Hunter shot and heartbreak follow-up deaths", () => {
    const hunterManager = createRoomWithWildesKind({
      4: { role: "jaeger", originalRole: "jaeger" },
    });
    let snapshot = latestGmSnapshot(send(hunterManager, "gm", { type: "gm:dayVote", payload: { playerId: 4 } }));
    expect(snapshot.players.find(player => player.id === 2)?.role).toBe("wildeskind");
    expect(snapshot.triggerQueue).toHaveLength(1);

    snapshot = latestGmSnapshot(send(hunterManager, "gm", { type: "gm:resolveHunter", payload: { targetId: 3 } }));
    expect(snapshot.players.find(player => player.id === 2)?.role).toBe("werwolf");
    expect(snapshot.players.find(player => player.id === 3)?.alive).toBe(false);

    const loverManager = createRoomWithWildesKind({
      3: { lover: 4 },
      4: { lover: 3 },
    });
    snapshot = latestGmSnapshot(send(loverManager, "gm", { type: "gm:dayVote", payload: { playerId: 4 } }));
    expect(snapshot.players.find(player => player.id === 2)?.role).toBe("werwolf");
    expect(snapshot.players.find(player => player.id === 3)?.alive).toBe(false);
    expect(snapshot.log.map(entry => entry.text)).toContain("💔 Dorf 1 war verliebt! Vorbild stirbt an gebrochenem Herzen.");
  });

  it("does not convert Wildes Kind if it is already dead when the role model dies", () => {
    const manager = createRoomWithWildesKind();
    send(manager, "gm", { type: "gm:setPlayers", payload: { players: wildesKindPlayers({ 2: { alive: false } }) } });
    send(manager, "gm", { type: "gm:updateNightAction", payload: { nightVictim: 3 } });

    const snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:resolveNight" }));

    expect(snapshot.players.find(player => player.id === 2)?.role).toBe("wildeskind");
    expect(snapshot.players.find(player => player.id === 2)?.alive).toBe(false);
    expect(snapshot.players.find(player => player.id === 3)?.alive).toBe(false);
    expect(snapshot.log.map(entry => entry.text)).not.toContain("🌿 Wildes Kind verliert sein Vorbild und wird heimlich zum Werwolf.");
  });

  it("only accepts alive non-Nachtgast players as Nachtgast hosts", () => {
    const manager = createRoomWithNachtgast();

    let snapshot = latestGmSnapshot(send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { nachtgastTarget: 3 },
    }));
    expect(snapshot.nachtgastTarget).toBe(3);

    snapshot = latestGmSnapshot(send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { nachtgastTarget: null },
    }));
    expect(snapshot.nachtgastTarget).toBeNull();

    snapshot = latestGmSnapshot(send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { nachtgastTarget: 3 },
    }));
    expect(snapshot.nachtgastTarget).toBe(3);

    snapshot = latestGmSnapshot(send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { nachtgastTarget: 99 },
    }));
    expect(snapshot.nachtgastTarget).toBe(3);

    snapshot = latestGmSnapshot(send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { nachtgastTarget: 2 },
    }));
    expect(snapshot.nachtgastTarget).toBe(3);

    send(manager, "gm", {
      type: "gm:setPlayers",
      payload: { players: nachtgastPlayers().map(player => player.id === 4 ? { ...player, alive: false } : player) },
    });
    snapshot = latestGmSnapshot(send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { nachtgastTarget: 4 },
    }));
    expect(snapshot.nachtgastTarget).toBe(3);
  });

  it("lets Nachtgast survive a direct wolf attack while visiting", () => {
    const manager = createRoomWithNachtgast();
    send(manager, "gm", { type: "gm:updateNightAction", payload: { nachtgastTarget: 3, nightVictim: 2 } });

    const snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:resolveNight" }));

    expect(snapshot.players.find(player => player.id === 2)?.alive).toBe(true);
    expect(snapshot.dayDeaths).toEqual([]);
    expect(snapshot.log.map(entry => entry.text)).toContain("🐺 Die Werwölfe finden Nachtgast nicht zu Hause.");
  });

  it("kills Nachtgast alongside the host when wolves attack the host", () => {
    const manager = createRoomWithNachtgast();
    send(manager, "gm", { type: "gm:updateNightAction", payload: { nachtgastTarget: 3, nightVictim: 3 } });

    const snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:resolveNight" }));

    expect(snapshot.players.find(player => player.id === 2)?.alive).toBe(false);
    expect(snapshot.players.find(player => player.id === 3)?.alive).toBe(false);
    expect(snapshot.dayDeaths.map(player => player.name)).toEqual(["Nachtgast", "Gastgeber"]);
  });

  it("lets Witch heal save only the wolf target, not visiting Nachtgast", () => {
    const manager = createRoomWithNachtgast();
    send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { nachtgastTarget: 3, nightVictim: 3, witchHealThisRound: true },
    });

    const snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:resolveNight" }));

    expect(snapshot.players.find(player => player.id === 2)?.alive).toBe(false);
    expect(snapshot.players.find(player => player.id === 3)?.alive).toBe(true);
    expect(snapshot.dayDeaths.map(player => player.name)).toEqual(["Nachtgast"]);
    expect(snapshot.witchHealUsed).toBe(true);
  });

  it("keeps Nachtgast out of host-targeted Witch poison", () => {
    const hostPoisonManager = createRoomWithNachtgast();
    send(hostPoisonManager, "gm", {
      type: "gm:updateNightAction",
      payload: { nachtgastTarget: 3, witchPoisonTarget: 3 },
    });
    const hostPoisonSnapshot = latestGmSnapshot(send(hostPoisonManager, "gm", { type: "gm:resolveNight" }));
    expect(hostPoisonSnapshot.players.find(player => player.id === 2)?.alive).toBe(true);
    expect(hostPoisonSnapshot.players.find(player => player.id === 3)?.alive).toBe(false);

    const directPoisonManager = createRoomWithNachtgast();
    send(directPoisonManager, "gm", {
      type: "gm:updateNightAction",
      payload: { nachtgastTarget: 3, witchPoisonTarget: 2 },
    });
    const directPoisonSnapshot = latestGmSnapshot(send(directPoisonManager, "gm", { type: "gm:resolveNight" }));
    expect(directPoisonSnapshot.players.find(player => player.id === 2)?.alive).toBe(false);
    expect(directPoisonSnapshot.players.find(player => player.id === 3)?.alive).toBe(true);
  });

  it("kills Nachtgast when Urwolf transforms the visited host", () => {
    const manager = createRoomWithNachtgast("urwolf");
    send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { nachtgastTarget: 3, nightVictim: 3, urwolfTransform: true },
    });

    const snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:resolveNight" }));

    expect(snapshot.players.find(player => player.id === 2)?.alive).toBe(false);
    expect(snapshot.players.find(player => player.id === 3)?.role).toBe("werwolf");
    expect(snapshot.players.find(player => player.id === 3)?.alive).toBe(true);
    expect(snapshot.urwolfUsed).toBe(true);
  });

  it("does not consume Urwolf when transforming direct-targeted Nachtgast fails", () => {
    const manager = createRoomWithNachtgast("urwolf");
    send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { nachtgastTarget: 3, nightVictim: 2, urwolfTransform: true },
    });

    const snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:resolveNight" }));

    expect(snapshot.players.find(player => player.id === 2)?.alive).toBe(true);
    expect(snapshot.players.find(player => player.id === 2)?.role).toBe("nachtgast");
    expect(snapshot.urwolfUsed).toBe(false);
    expect(snapshot.winner).toBeNull();
  });

  it("only accepts valid Beschuetzer targets", () => {
    const manager = createRoomWithBeschuetzer();

    let snapshot = latestGmSnapshot(send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { beschuetzerTarget: 3 },
    }));
    expect(snapshot.beschuetzerTarget).toBe(3);

    snapshot = latestGmSnapshot(send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { beschuetzerTarget: null },
    }));
    expect(snapshot.beschuetzerTarget).toBeNull();

    snapshot = latestGmSnapshot(send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { beschuetzerTarget: 3 },
    }));
    expect(snapshot.beschuetzerTarget).toBe(3);

    snapshot = latestGmSnapshot(send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { beschuetzerTarget: 2 },
    }));
    expect(snapshot.beschuetzerTarget).toBe(3);

    snapshot = latestGmSnapshot(send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { beschuetzerTarget: 99 },
    }));
    expect(snapshot.beschuetzerTarget).toBe(3);

    send(manager, "gm", {
      type: "gm:setPlayers",
      payload: { players: beschuetzerPlayers().map(player => player.id === 5 ? { ...player, alive: false } : player) },
    });
    snapshot = latestGmSnapshot(send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { beschuetzerTarget: 5 },
    }));
    expect(snapshot.beschuetzerTarget).toBe(3);

    snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:resolveNight" }));
    expect(snapshot.beschuetzerLastTarget).toBe(3);

    send(manager, "gm", { type: "gm:startDay" });
    send(manager, "gm", { type: "gm:startNight" });

    snapshot = latestGmSnapshot(send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { beschuetzerTarget: 3 },
    }));
    expect(snapshot.beschuetzerTarget).toBeNull();

    snapshot = latestGmSnapshot(send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { beschuetzerTarget: 4 },
    }));
    expect(snapshot.beschuetzerTarget).toBe(4);
  });

  it("prevents a wolf attack without spending Witch heal", () => {
    const manager = createRoomWithBeschuetzer();
    send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { beschuetzerTarget: 3, nightVictim: 3, witchHealThisRound: true },
    });

    const snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:resolveNight" }));

    expect(snapshot.players.find(player => player.id === 3)?.alive).toBe(true);
    expect(snapshot.dayDeaths).toEqual([]);
    expect(snapshot.witchHealUsed).toBe(false);
    expect(snapshot.beschuetzerLastTarget).toBe(3);
    expect(snapshot.log.map(entry => entry.text)).toContain("🛡️ Beschützer verhindert den Angriff auf Ziel.");
  });

  it("protects the Nachtgast host before collateral damage", () => {
    const manager = createRoomWithBeschuetzer("werwolf", "dorfbewohner", true);
    send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { beschuetzerTarget: 3, nachtgastTarget: 3, nightVictim: 3 },
    });

    const snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:resolveNight" }));

    expect(snapshot.players.find(player => player.id === 3)?.alive).toBe(true);
    expect(snapshot.players.find(player => player.id === 4)?.alive).toBe(true);
    expect(snapshot.dayDeaths).toEqual([]);
  });

  it("keeps a protected Verfluchter from converting", () => {
    const manager = createRoomWithBeschuetzer("werwolf", "verfluchter");
    send(manager, "gm", { type: "gm:updateNightAction", payload: { beschuetzerTarget: 3 } });
    send(manager, "gm", { type: "gm:advanceNightStep" });
    send(manager, "gm", { type: "gm:advanceNightStep" });
    send(manager, "gm", { type: "gm:updateNightAction", payload: { nightVictim: 3 } });

    let snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:advanceNightStep" }));
    expect(snapshot.players.find(player => player.id === 3)?.role).toBe("verfluchter");
    expect(snapshot.verfluchterConvertedThisNight).toBeNull();

    snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:resolveNight" }));
    expect(snapshot.players.find(player => player.id === 3)?.role).toBe("verfluchter");
    expect(snapshot.players.find(player => player.id === 3)?.alive).toBe(true);
    expect(snapshot.dayDeaths).toEqual([]);
  });

  it("blocks Urwolf transform without consuming the ability", () => {
    const manager = createRoomWithBeschuetzer("urwolf");
    send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { beschuetzerTarget: 3, nightVictim: 3, urwolfTransform: true },
    });

    const snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:resolveNight" }));

    expect(snapshot.players.find(player => player.id === 3)?.role).toBe("dorfbewohner");
    expect(snapshot.players.find(player => player.id === 3)?.alive).toBe(true);
    expect(snapshot.urwolfUsed).toBe(false);
    expect(snapshot.dayDeaths).toEqual([]);
  });

  it("lets Witch poison kill a protected player", () => {
    const manager = createRoomWithBeschuetzer();
    send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { beschuetzerTarget: 3, nightVictim: 3, witchPoisonTarget: 3 },
    });

    const snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:resolveNight" }));

    expect(snapshot.players.find(player => player.id === 3)?.alive).toBe(false);
    expect(snapshot.dayDeaths.map(player => player.name)).toEqual(["Ziel"]);
    expect(snapshot.witchPoisonUsed).toBe(true);
  });

  it("adds the Harter Bursche notification before dawn after a wound", () => {
    const baseParams = {
      round: 1,
      urwolfUsed: false,
      witchHealUsed: false,
      witchPoisonUsed: false,
      verfluchterConvertedThisNight: null,
      hadRole: (roleId: RoleId) => roleId === "harterbursche" || roleId === "hexe",
      aliveWithRole: (roleId: RoleId) => roleId === "harterbursche" || roleId === "hexe",
      amorPick: [],
    };

    expect(buildNightSteps({ ...baseParams, harterBurscheWoundedThisNight: null }).map(step => step.id))
      .toEqual(["sleep", "wolves", "witch", "dawn"]);
    expect(buildNightSteps({ ...baseParams, harterBurscheWoundedThisNight: 2 }).map(step => step.id))
      .toEqual(["sleep", "wolves", "witch", "harterbursche", "dawn"]);
  });

  it("wounds Harter Bursche instead of killing them from a wolf attack", () => {
    const { manager } = createRoomWithPlayers();
    send(manager, "gm", { type: "gm:setPlayers", payload: { players: harterBurschePlayers() } });
    send(manager, "gm", { type: "gm:updateNightAction", payload: { nightVictim: 2 } });

    const messages = send(manager, "gm", { type: "gm:resolveNight" });
    const snapshot = latestGmSnapshot(messages);
    const hardGuy = snapshot.players.find(player => player.id === 2);
    const hardGuyPlayerMessage = messages.find(
      message => message.clientId === "p1" && message.message.type === "snapshot" && message.message.snapshot.view === "player",
    )?.message;

    expect(hardGuy?.alive).toBe(true);
    expect(snapshot.dayDeaths).toEqual([]);
    expect(snapshot.harterBurscheWounded).toBe(2);
    expect(snapshot.harterBurscheWoundedThisNight).toBe(2);
    expect(snapshot.log.map(entry => entry.text)).toContain("💪 Harter Bursche ist der Harte Bursche und überlebt den Angriff zunächst.");
    expect(hardGuyPlayerMessage).toBeTruthy();
    if (hardGuyPlayerMessage?.type === "snapshot" && hardGuyPlayerMessage.snapshot.view === "player") {
      expect(hardGuyPlayerMessage.snapshot).not.toHaveProperty("harterBurscheWounded");
    }
  });

  it("keeps Harter Bursche alive after the GM wound notification in the same night", () => {
    const manager = createRoomWithHarterBursche();
    send(manager, "gm", { type: "gm:advanceNightStep" });
    send(manager, "gm", { type: "gm:updateNightAction", payload: { nightVictim: 2 } });
    send(manager, "gm", { type: "gm:advanceNightStep" });

    let snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:advanceNightStep" }));
    expect(snapshot.harterBurscheWounded).toBe(2);
    expect(snapshot.harterBurscheWoundedThisNight).toBe(2);
    expect(snapshot.nightStepIdx).toBe(3);

    snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:advanceNightStep" }));
    snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:resolveNight" }));

    expect(snapshot.players.find(player => player.id === 2)?.alive).toBe(true);
    expect(snapshot.dayDeaths).toEqual([]);
  });

  it("kills wounded Harter Bursche in the next night report", () => {
    const manager = createRoomWithHarterBursche();
    send(manager, "gm", { type: "gm:updateNightAction", payload: { nightVictim: 2 } });
    send(manager, "gm", { type: "gm:resolveNight" });
    send(manager, "gm", { type: "gm:startDay" });
    send(manager, "gm", { type: "gm:startNight" });

    const snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:resolveNight" }));

    expect(snapshot.players.find(player => player.id === 2)?.alive).toBe(false);
    expect(snapshot.dayDeaths.map(player => player.name)).toEqual(["Harter Bursche"]);
    expect(snapshot.harterBurscheWounded).toBeNull();
    expect(snapshot.log.map(entry => entry.text)).toContain("💪 Harter Bursche stirbt an den Wunden des Werwolf-Angriffs.");
  });

  it("lets Witch heal prevent the initial Harter Bursche wound", () => {
    const manager = createRoomWithHarterBursche();
    send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { nightVictim: 2, witchHealThisRound: true },
    });

    const snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:resolveNight" }));

    expect(snapshot.players.find(player => player.id === 2)?.alive).toBe(true);
    expect(snapshot.dayDeaths).toEqual([]);
    expect(snapshot.harterBurscheWounded).toBeNull();
    expect(snapshot.witchHealUsed).toBe(true);
  });

  it("keeps Beschützer protection from wounding Harter Bursche", () => {
    const manager = createRoomWithBeschuetzer("werwolf", "harterbursche");
    send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { beschuetzerTarget: 3, nightVictim: 3 },
    });

    const snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:resolveNight" }));

    expect(snapshot.players.find(player => player.id === 3)?.alive).toBe(true);
    expect(snapshot.dayDeaths).toEqual([]);
    expect(snapshot.harterBurscheWounded).toBeNull();
  });

  it("wounds Harter Bursche but still kills Nachtgast visiting them", () => {
    const manager = createRoomWithHarterBursche(true);
    send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { nachtgastTarget: 2, nightVictim: 2 },
    });

    const snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:resolveNight" }));

    expect(snapshot.players.find(player => player.id === 2)?.alive).toBe(true);
    expect(snapshot.players.find(player => player.id === 3)?.alive).toBe(false);
    expect(snapshot.dayDeaths.map(player => player.name)).toEqual(["Nachtgast"]);
    expect(snapshot.harterBurscheWounded).toBe(2);
  });

  it("lets wounded Harter Bursche be targeted again without changing the delayed death", () => {
    const manager = createRoomWithHarterBursche();
    send(manager, "gm", { type: "gm:updateNightAction", payload: { nightVictim: 2 } });
    send(manager, "gm", { type: "gm:resolveNight" });
    send(manager, "gm", { type: "gm:startDay" });
    send(manager, "gm", { type: "gm:startNight" });
    send(manager, "gm", { type: "gm:updateNightAction", payload: { nightVictim: 2, witchHealThisRound: true } });

    const snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:resolveNight" }));

    expect(snapshot.players.find(player => player.id === 2)?.alive).toBe(false);
    expect(snapshot.dayDeaths.map(player => player.name)).toEqual(["Harter Bursche"]);
    expect(snapshot.witchHealUsed).toBe(true);
    expect(snapshot.log.map(entry => entry.text)).toContain("🧪 Hexe schützt Harter Bursche vor dem erneuten Angriff.");
    expect(snapshot.log.map(entry => entry.text)).toContain("💪 Harter Bursche stirbt an den Wunden des Werwolf-Angriffs.");
  });

  it("clears a pending Harter Bursche wound when the village executes them", () => {
    const manager = createRoomWithHarterBursche();
    send(manager, "gm", { type: "gm:updateNightAction", payload: { nightVictim: 2 } });
    send(manager, "gm", { type: "gm:resolveNight" });
    send(manager, "gm", { type: "gm:startDay" });

    const snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:dayVote", payload: { playerId: 2 } }));

    expect(snapshot.players.find(player => player.id === 2)?.alive).toBe(false);
    expect(snapshot.harterBurscheWounded).toBeNull();
  });

  it("converts Verfluchter when wolves attack instead of killing them", () => {
    const manager = createRoomWithVerfluchter();

    const snapshot = convertVerfluchterByWolfAttack(manager);
    const converted = snapshot.players.find(player => player.id === 2);

    expect(converted?.role).toBe("werwolf");
    expect(converted?.originalRole).toBe("verfluchter");
    expect(converted?.alive).toBe(true);
    expect(snapshot.verfluchterConvertedThisNight).toBe(2);
    expect(snapshot.nightStepIdx).toBe(2);
    expect(snapshot.log.map(entry => entry.text)).toContain("⛓️ Verfluchter war verflucht und wird zum Werwolf.");
    const room = manager.getRoomForTest(snapshot.roomCode);
    expect(room ? getEffectiveTeamForRoom(room, 2, null) : null).toBe("wolf");
  });

  it("keeps the wolf victim frozen after Verfluchter conversion", () => {
    const manager = createRoomWithVerfluchter();
    convertVerfluchterByWolfAttack(manager);

    let snapshot = latestGmSnapshot(send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { nightVictim: 5 },
    }));
    expect(snapshot.nightVictim).toBe(2);
    expect(snapshot.verfluchterConvertedThisNight).toBe(2);

    snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:resolveNight" }));

    expect(snapshot.players.find(player => player.id === 2)?.role).toBe("werwolf");
    expect(snapshot.players.find(player => player.id === 2)?.alive).toBe(true);
    expect(snapshot.players.find(player => player.id === 5)?.alive).toBe(true);
    expect(snapshot.dayDeaths).toEqual([]);
  });

  it("ignores stale Urwolf transform for a converted Verfluchter", () => {
    const manager = createRoomWithVerfluchter("urwolf");
    convertVerfluchterByWolfAttack(manager);
    send(manager, "gm", { type: "gm:updateNightAction", payload: { urwolfTransform: true } });

    const snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:resolveNight" }));
    const converted = snapshot.players.find(player => player.id === 2);

    expect(converted?.role).toBe("werwolf");
    expect(converted?.alive).toBe(true);
    expect(snapshot.urwolfUsed).toBe(false);
    expect(snapshot.dayDeaths).toEqual([]);
  });

  it("lets Witch poison a converted Verfluchter without spending heal", () => {
    const manager = createRoomWithVerfluchter();
    convertVerfluchterByWolfAttack(manager);
    send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: { witchHealThisRound: true, witchPoisonTarget: 2 },
    });

    const snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:resolveNight" }));

    expect(snapshot.players.find(player => player.id === 2)?.alive).toBe(false);
    expect(snapshot.dayDeaths.map(player => player.name)).toEqual(["Verfluchter"]);
    expect(snapshot.witchHealUsed).toBe(false);
    expect(snapshot.witchPoisonUsed).toBe(true);
  });

  it("kills Nachtgast when they visit an attacked Verfluchter", () => {
    const manager = createRoomWithVerfluchter("werwolf", true);
    send(manager, "gm", { type: "gm:advanceNightStep" });
    send(manager, "gm", { type: "gm:updateNightAction", payload: { nachtgastTarget: 2 } });
    send(manager, "gm", { type: "gm:advanceNightStep" });
    send(manager, "gm", { type: "gm:updateNightAction", payload: { nightVictim: 2 } });
    send(manager, "gm", { type: "gm:advanceNightStep" });

    const snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:resolveNight" }));

    expect(snapshot.players.find(player => player.id === 2)?.role).toBe("werwolf");
    expect(snapshot.players.find(player => player.id === 2)?.alive).toBe(true);
    expect(snapshot.players.find(player => player.id === 3)?.alive).toBe(false);
    expect(snapshot.dayDeaths.map(player => player.name)).toEqual(["Nachtgast"]);
  });

  it("kills Verfluchter normally from non-wolf effects", () => {
    const manager = createRoomWithVerfluchter();

    const snapshot = latestGmSnapshot(send(manager, "gm", { type: "gm:dayVote", payload: { playerId: 2 } }));

    expect(snapshot.players.find(player => player.id === 2)?.role).toBe("verfluchter");
    expect(snapshot.players.find(player => player.id === 2)?.alive).toBe(false);
    expect(snapshot.verfluchterConvertedThisNight).toBeNull();
  });

  it("only applies whitelisted night action fields", () => {
    const { manager } = createRoomWithPlayers();
    const messages = send(manager, "gm", {
      type: "gm:updateNightAction",
      payload: {
        nightVictim: 2,
        nachtgastTarget: 3,
        winner: "wolves",
        roomPhase: "ended",
        players: [],
      },
    } as unknown as ClientMessage);

    const snapshot = latestGmSnapshot(messages);
    expect(snapshot.nightVictim).toBe(2);
    expect(snapshot.nachtgastTarget).toBe(3);
    expect(snapshot.winner).toBeNull();
    expect(snapshot.roomPhase).toBe("lobby");
    expect(snapshot.players).toHaveLength(5);
  });

  it("rebases running timers when the GM edits the remaining time", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(100_000);
      const { manager } = createRoomWithPlayers();
      send(manager, "gm", { type: "gm:setTimer", payload: { dayTimer: 100, timerRunning: true } });

      vi.setSystemTime(110_000);
      send(manager, "gm", { type: "gm:setTimer", payload: { dayTimer: 80 } });

      const tickMessages = manager.tickTimers(111_000);
      const snapshot = latestGmSnapshot(tickMessages);
      expect(snapshot.dayTimer).toBe(79);
      expect(snapshot.timerRunning).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("manual role assignment clears stale roles for omitted players", () => {
    const players: Player[] = [
      { id: 1, name: "A", role: "werwolf", originalRole: "werwolf", alive: true, lover: null },
      { id: 2, name: "B", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
    ];
    expect(assignManualRoles(players, { "1": "seher" })).toEqual([
      { id: 1, name: "A", role: "seher", originalRole: "seher", alive: true, lover: null },
      { id: 2, name: "B", role: null, originalRole: null, alive: true, lover: null },
    ]);
  });

  it("auto-fills villagers from the selected non-villager roles", () => {
    expect(autoFillVillagers({}, 10).dorfbewohner).toBe(10);

    const balanced = autoFillVillagers({ werwolf: 2, seher: 1 }, 10);
    expect(balanced).toMatchObject({ werwolf: 2, seher: 1, dorfbewohner: 7 });
    expect(nonVillagerRoleTotal(balanced)).toBe(3);

    const overflow = autoFillVillagers({ werwolf: 6 }, 5);
    expect(overflow).toMatchObject({ werwolf: 6, dorfbewohner: 0 });
    expect(roleCountTotal(overflow)).toBe(6);

    const pool = buildRolePool(autoFillVillagers({ werwolf: 2 }, 5));
    expect(pool.filter(roleId => roleId === "dorfbewohner")).toHaveLength(3);

    const zeroPlayers = autoFillVillagers({}, 0);
    expect(zeroPlayers.dorfbewohner).toBe(0);
    expect(nonVillagerRoleTotal(zeroPlayers)).toBe(0);
    expect(roleCountTotal(zeroPlayers)).toBe(0);
    expect(buildRolePool(zeroPlayers)).toHaveLength(0);

    const negativePlayers = autoFillVillagers({ werwolf: 2, dorfbewohner: 5 }, -3);
    expect(negativePlayers).toMatchObject({ werwolf: 2, dorfbewohner: 0 });
    expect(nonVillagerRoleTotal(negativePlayers)).toBe(2);
    expect(roleCountTotal(negativePlayers)).toBe(2);
    const negativePool = buildRolePool(negativePlayers);
    expect(negativePool.filter(roleId => roleId === "werwolf")).toHaveLength(2);
    expect(negativePool.filter(roleId => roleId === "dorfbewohner")).toHaveLength(0);
  });

  it("builds role pools only from canonical roles and sanitized counts", () => {
    const roleCounts = {
      werwolf: 1.9,
      dorfbewohner: -2,
      "missing-role": 3,
      nachtgast: 1,
      beschuetzer: 1,
      wildeskind: 1,
      verfluchter: 1,
    } as unknown as RoleCounts;
    const pool = buildRolePool(roleCounts);
    expect(ROLES.beschuetzer).toMatchObject({ team: "village", cat: "special", unique: true });
    expect(ROLES.wildeskind).toMatchObject({ team: "village", cat: "special", unique: true });
    expect(ROLES.verfluchter).toMatchObject({ team: "village", cat: "special", unique: true });
    expect(pool).toEqual(["werwolf", "nachtgast", "beschuetzer", "wildeskind", "verfluchter"]);
    expect(roleCountTotal(roleCounts)).toBe(pool.length);
  });

  it("rejects malformed websocket client messages at the trust boundary", () => {
    expect(isClientMessage({ type: "unknown" })).toBe(false);
    expect(isClientMessage({ type: "gm:startGame", roomCode: {} })).toBe(false);
    expect(isClientMessage({ type: "gm:closeRoom" })).toBe(true);
    expect(isClientMessage({ type: "gm:advanceNightStep" })).toBe(true);
    expect(isClientMessage({ type: "gm:advanceNightStep", payload: { urwolfTransform: true } })).toBe(true);
    expect(isClientMessage({ type: "gm:advanceNightStep", payload: { nightVictim: 2 } })).toBe(false);
    expect(isClientMessage({ type: "gm:updateRoleCounts", payload: { roleCounts: { werwolf: -1 } } })).toBe(false);
    expect(isClientMessage({ type: "gm:updateNightAction", payload: { nachtgastTarget: 2 } })).toBe(true);
    expect(isClientMessage({ type: "gm:updateNightAction", payload: { nachtgastTarget: -1 } })).toBe(false);
    expect(isClientMessage({ type: "gm:updateNightAction", payload: { beschuetzerTarget: 2 } })).toBe(true);
    expect(isClientMessage({ type: "gm:updateNightAction", payload: { wildesKindVorbild: 2 } })).toBe(true);
    expect(isClientMessage({ type: "gm:updateNightAction", payload: { wildesKindVorbild: -1 } })).toBe(false);
    expect(isClientMessage({ type: "gm:updateNightAction", payload: { beschuetzerLastTarget: 2 } })).toBe(false);
    expect(isClientMessage({ type: "gm:setPlayers", payload: { players: [{ id: "bad" }] } })).toBe(false);
    expect(isClientMessage({
      type: "gm:setPlayers",
      payload: {
        players: [
          { id: 1, name: "A", role: null, originalRole: null, alive: true, lover: null },
          { id: 1, name: "B", role: null, originalRole: null, alive: true, lover: null },
        ],
      },
    })).toBe(false);
    expect(isClientMessage({ type: "gm:setManualAssign", payload: { manualAssign: { "1": undefined } } })).toBe(true);
    expect(isClientMessage({ type: "player:joinRoom", payload: { roomCode: "ABC123", name: "Alex" } })).toBe(true);
  });

  it("treats stale runtime role values as village instead of throwing", () => {
    expect(getTeam("missing-role" as Player["role"])).toBe("village");
  });

  it("lets checkWin count players by an effective team resolver", () => {
    const players: Player[] = [
      { id: 1, name: "Converted", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
      { id: 2, name: "Villager", role: "dorfbewohner", originalRole: "dorfbewohner", alive: true, lover: null },
    ];

    expect(checkWin(players)).toBe("village");
    expect(checkWin(players, { getTeamForPlayer: player => player.id === 1 ? "wolf" : "village" })).toBe("wolves");
  });
});
