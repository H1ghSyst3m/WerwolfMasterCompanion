import { makeRoomCode, makeToken, normalizeName, normalizeRoomCode } from "./roomIdentity";
import { broadcast, connected } from "./roomSnapshots";
import { createServerRoom, createServerRoomPlayer } from "./roomState";
import type { ClientSession, OutgoingMessage, ServerRoom, ServerRoomPlayer } from "./roomTypes";

export interface RoomSessionContext {
  rooms: Map<string, ServerRoom>;
  clientSessions: Map<string, ClientSession>;
}

export function requireRoom(context: RoomSessionContext, roomCode: string): ServerRoom {
  const room = context.rooms.get(roomCode);
  if (!room) throw new Error("Raum nicht gefunden.");
  return room;
}

export function disconnectClient(context: RoomSessionContext, clientId: string): OutgoingMessage[] {
  const session = context.clientSessions.get(clientId);
  if (!session) return [];
  context.clientSessions.delete(clientId);
  const room = context.rooms.get(session.roomCode);
  if (!room) return [];
  if (session.role === "gm" && room.hostClientId === clientId) {
    room.hostClientId = null;
  }
  if (session.role === "player") {
    const player = room.players.find(candidate => candidate.id === session.playerId);
    if (player && player.clientId === clientId) {
      player.clientId = null;
      player.connected = false;
    }
  }
  return broadcast(room);
}

export function detachClient(context: RoomSessionContext, clientId: string): OutgoingMessage[] {
  const session = context.clientSessions.get(clientId);
  if (!session) return [];
  const oldRoom = context.rooms.get(session.roomCode);
  if (!oldRoom) {
    context.clientSessions.delete(clientId);
    return [];
  }

  if (session.role === "gm") {
    context.clientSessions.delete(clientId);
    if (oldRoom.hostClientId === clientId) {
      oldRoom.hostClientId = null;
      oldRoom.hostToken = makeToken();
    }
  } else {
    const player = oldRoom.players.find(candidate => candidate.id === session.playerId);
    if (player?.alive && oldRoom.roomPhase !== "lobby" && oldRoom.roomPhase !== "ended") {
      throw new Error("Raum wechseln ist erst in der Lobby, nach Spielende oder nach deinem Tod möglich.");
    }
    context.clientSessions.delete(clientId);
    if (player?.clientId === clientId) {
      player.clientId = null;
      player.connected = false;
    }
  }

  return broadcast(oldRoom);
}

export function createRoom(context: RoomSessionContext, clientId: string): OutgoingMessage[] {
  const outgoing = detachClient(context, clientId);
  const code = makeRoomCode(new Set(context.rooms.keys()));
  const hostToken = makeToken();
  const room = createServerRoom(code, hostToken, clientId);
  context.rooms.set(code, room);
  context.clientSessions.set(clientId, { roomCode: code, clientToken: hostToken, role: "gm" });
  return [
    ...outgoing,
    connected(clientId, { roomCode: code, clientToken: hostToken, role: "gm" }),
    ...broadcast(room),
  ];
}

export function closeRoom(context: RoomSessionContext, room: ServerRoom): OutgoingMessage[] {
  if (room.roomPhase !== "lobby") throw new Error("Der Raum kann nur in der Lobby geschlossen werden.");
  const connectedClientIds = [
    room.hostClientId,
    ...room.players.map(player => player.clientId),
  ].filter((clientId): clientId is string => Boolean(clientId));

  for (const [clientId, session] of context.clientSessions.entries()) {
    if (session.roomCode === room.code) context.clientSessions.delete(clientId);
  }
  context.rooms.delete(room.code);

  return [...new Set(connectedClientIds)].map(clientId => ({
    clientId,
    message: { type: "roomClosed", roomCode: room.code },
  }));
}

export function joinRoom(context: RoomSessionContext, clientId: string, payload: unknown): OutgoingMessage[] {
  const data = payload as { roomCode?: unknown; name?: unknown };
  const roomCode = normalizeRoomCode(data.roomCode);
  const name = normalizeName(data.name);
  const room = requireRoom(context, roomCode);
  if (room.locked || room.roomPhase !== "lobby") throw new Error("Die Lobby ist bereits gesperrt.");
  if (!name) throw new Error("Bitte gib einen Namen ein.");
  const existingPlayer = room.players.find(player => player.name.localeCompare(name, undefined, { sensitivity: "accent" }) === 0);
  if (existingPlayer?.connected) {
    throw new Error("Dieser Name ist im Raum bereits vergeben.");
  }
  const outgoing = detachClient(context, clientId);
  if (existingPlayer && !existingPlayer.connected) {
    existingPlayer.token = makeToken();
    existingPlayer.clientId = clientId;
    existingPlayer.connected = true;
    existingPlayer.roleRevealed = false;
    existingPlayer.role = null;
    existingPlayer.originalRole = null;
    existingPlayer.alive = true;
    existingPlayer.lover = null;
    context.clientSessions.set(clientId, {
      roomCode: room.code,
      clientToken: existingPlayer.token,
      role: "player",
      playerId: existingPlayer.id,
    });
    return [
      ...outgoing,
      connected(clientId, { roomCode: room.code, clientToken: existingPlayer.token, role: "player" }),
      ...broadcast(room),
    ];
  }
  const player = createServerRoomPlayer(room.nextPlayerId, name, clientId);
  room.nextPlayerId += 1;
  room.players.push(player);
  context.clientSessions.set(clientId, { roomCode: room.code, clientToken: player.token, role: "player", playerId: player.id });
  return [
    ...outgoing,
    connected(clientId, { roomCode: room.code, clientToken: player.token, role: "player" }),
    ...broadcast(room),
  ];
}

export function resumeSession(context: RoomSessionContext, clientId: string, payload: unknown): OutgoingMessage[] {
  const data = payload as { roomCode?: unknown; clientToken?: unknown };
  const roomCode = normalizeRoomCode(data.roomCode);
  const clientToken = String(data.clientToken ?? "");
  const room = requireRoom(context, roomCode);
  if (clientToken === room.hostToken) {
    const currentSession = context.clientSessions.get(clientId);
    const outgoing = currentSession?.roomCode === room.code && currentSession.clientToken === clientToken
      ? []
      : detachClient(context, clientId);
    if (room.hostClientId && room.hostClientId !== clientId) context.clientSessions.delete(room.hostClientId);
    room.hostClientId = clientId;
    context.clientSessions.set(clientId, { roomCode: room.code, clientToken, role: "gm" });
    return [
      ...outgoing,
      connected(clientId, { roomCode: room.code, clientToken, role: "gm" }),
      ...broadcast(room),
    ];
  }
  const player = room.players.find(candidate => candidate.token === clientToken);
  if (!player) throw new Error("Die gespeicherte Verbindung konnte nicht wiederhergestellt werden.");
  const currentSession = context.clientSessions.get(clientId);
  const outgoing = currentSession?.roomCode === room.code && currentSession.clientToken === clientToken
    ? []
    : detachClient(context, clientId);
  deletePlayerSessions(context, room.code, player.id, clientId);
  player.clientId = clientId;
  player.connected = true;
  context.clientSessions.set(clientId, { roomCode: room.code, clientToken, role: "player", playerId: player.id });
  return [
    ...outgoing,
    connected(clientId, { roomCode: room.code, clientToken, role: "player" }),
    ...broadcast(room),
  ];
}

export function leaveRoom(context: RoomSessionContext, room: ServerRoom, session: ClientSession, player: ServerRoomPlayer): OutgoingMessage[] {
  const clientId = player.clientId;
  if (!clientId) return [];
  context.clientSessions.delete(clientId);

  if (room.roomPhase === "lobby") {
    room.players = room.players.filter(candidate => candidate.id !== player.id);
    return [
      { clientId, message: { type: "leftRoom", roomCode: room.code } },
      ...broadcast(room),
    ];
  }

  if (room.roomPhase === "ended" || !player.alive) {
    player.clientId = null;
    player.connected = false;
    return [
      { clientId, message: { type: "leftRoom", roomCode: room.code } },
      ...broadcast(room),
    ];
  }

  context.clientSessions.set(clientId, session);
  throw new Error("Raum wechseln ist erst in der Lobby, nach Spielende oder nach deinem Tod möglich.");
}

export function kickPlayer(context: RoomSessionContext, room: ServerRoom, playerId: number | undefined): OutgoingMessage[] {
  if (room.roomPhase !== "lobby") throw new Error("Spieler können nur in der Lobby entfernt werden.");
  const target = room.players.find(player => player.id === playerId);
  if (!target) throw new Error("Spieler nicht gefunden.");
  const targetClientId = target.clientId;
  if (targetClientId) context.clientSessions.delete(targetClientId);
  room.players = room.players.filter(player => player.id !== target.id);
  const outgoing = broadcast(room);
  if (targetClientId) {
    outgoing.unshift({ clientId: targetClientId, message: { type: "kicked", roomCode: room.code } });
  }
  return outgoing;
}

export function transferHost(context: RoomSessionContext, oldHostClientId: string, room: ServerRoom, playerId: number | undefined): OutgoingMessage[] {
  if (room.roomPhase !== "lobby") throw new Error("Die Spielleitung kann nur in der Lobby übertragen werden.");
  const target = room.players.find(player => player.id === playerId);
  if (!target || !target.connected || !target.clientId) throw new Error("Wähle einen verbundenen Spieler aus.");
  const oldHost = room.hostClientId;
  room.players = room.players.filter(player => player.id !== target.id);
  room.hostToken = target.token;
  room.hostClientId = target.clientId;
  context.clientSessions.delete(oldHostClientId);
  context.clientSessions.set(target.clientId, { roomCode: room.code, clientToken: room.hostToken, role: "gm" });
  const outgoing: OutgoingMessage[] = [
    connected(target.clientId, { roomCode: room.code, clientToken: room.hostToken, role: "gm" }),
    ...broadcast(room),
  ];
  if (oldHost) outgoing.push({ clientId: oldHost, message: { type: "hostTransferred", roomCode: room.code } });
  return outgoing;
}

function deletePlayerSessions(context: RoomSessionContext, roomCode: string, playerId: number, exceptClientId: string): void {
  for (const [candidateClientId, candidateSession] of context.clientSessions.entries()) {
    if (
      candidateClientId !== exceptClientId &&
      candidateSession.roomCode === roomCode &&
      candidateSession.role === "player" &&
      candidateSession.playerId === playerId
    ) {
      context.clientSessions.delete(candidateClientId);
    }
  }
}
