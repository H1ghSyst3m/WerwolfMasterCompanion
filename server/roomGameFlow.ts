import { assignManualRoles, resetNightActions } from "../src/domain/gameState";
import { buildNightSteps } from "../src/logic/nightSteps";
import {
  checkWin,
  clearHarterBurscheWoundForDeadPlayer,
  convertPlayerToWerewolf,
  convertWildesKindIfVorbildNewlyDead,
  getHarterBurscheWoundedByWolfAttack,
  getNachtgastCollateralVictim,
  getUrwolfTransformTarget,
  getWolfAttackConvertedVerfluchter,
  isNachtgastAwayFromWolfAttack,
  killPlayer,
} from "../src/logic/gameLogic";
import { addLogText, getEffectiveTeamForRoom, mergePublicPlayers } from "./roomState";
import type { NightActionState } from "../src/domain/gameState";
import type { ServerRoom, ServerRoomPlayer } from "./roomTypes";
import type { RoleId } from "../src/types";

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

function isNullablePlayerId(value: unknown): value is number | null {
  return value === null || isNonNegativeInteger(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isNullableBoolean(value: unknown): value is boolean | null {
  return value === null || isBoolean(value);
}

function isPlayerIdArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(isNonNegativeInteger);
}

function isNachtgastHostCandidate(room: ServerRoom, playerId: number): boolean {
  return room.players.some(player => player.id === playerId && player.alive && player.role !== "nachtgast");
}

function isBeschuetzerTargetCandidate(room: ServerRoom, playerId: number): boolean {
  const beschuetzer = room.players.find(player => player.alive && player.role === "beschuetzer");
  return Boolean(
    beschuetzer &&
    playerId !== beschuetzer.id &&
    playerId !== room.beschuetzerLastTarget &&
    room.players.some(player => player.id === playerId && player.alive)
  );
}

function isWildesKindVorbildCandidate(room: ServerRoom, playerId: number): boolean {
  const wildesKind = room.players.find(player => player.alive && player.role === "wildeskind");
  return Boolean(
    wildesKind &&
    playerId !== wildesKind.id &&
    room.players.some(player => player.id === playerId && player.alive)
  );
}

export function applyNightActionPatch(room: ServerRoom, payload: unknown): void {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;
  const patch = payload as Partial<NightActionState>;

  if ("nightStepIdx" in patch && isNonNegativeInteger(patch.nightStepIdx)) room.nightStepIdx = patch.nightStepIdx;
  if (
    "nightVictim" in patch &&
    room.verfluchterConvertedThisNight === null &&
    !room.wolvesSkipNextNight &&
    isNullablePlayerId(patch.nightVictim)
  ) {
    room.nightVictim = patch.nightVictim;
  }
  if ("nachtgastTarget" in patch) {
    if (patch.nachtgastTarget === null) room.nachtgastTarget = null;
    if (isNonNegativeInteger(patch.nachtgastTarget) && isNachtgastHostCandidate(room, patch.nachtgastTarget)) {
      room.nachtgastTarget = patch.nachtgastTarget;
    }
  }
  if ("beschuetzerTarget" in patch) {
    if (patch.beschuetzerTarget === null) room.beschuetzerTarget = null;
    if (isNonNegativeInteger(patch.beschuetzerTarget) && isBeschuetzerTargetCandidate(room, patch.beschuetzerTarget)) {
      room.beschuetzerTarget = patch.beschuetzerTarget;
    }
  }
  if ("wildesKindVorbild" in patch) {
    if (patch.wildesKindVorbild === null) room.wildesKindVorbild = null;
    if (isNonNegativeInteger(patch.wildesKindVorbild) && isWildesKindVorbildCandidate(room, patch.wildesKindVorbild)) {
      room.wildesKindVorbild = patch.wildesKindVorbild;
    }
  }
  if ("urwolfTransform" in patch && isNullableBoolean(patch.urwolfTransform)) room.urwolfTransform = patch.urwolfTransform;
  if ("urwolfUsed" in patch && isBoolean(patch.urwolfUsed)) room.urwolfUsed = patch.urwolfUsed;
  if ("seerTarget" in patch && isNullablePlayerId(patch.seerTarget)) room.seerTarget = patch.seerTarget;
  if ("seerRevealed" in patch && isBoolean(patch.seerRevealed)) room.seerRevealed = patch.seerRevealed;
  if ("auraSeerTarget" in patch && isNullablePlayerId(patch.auraSeerTarget)) room.auraSeerTarget = patch.auraSeerTarget;
  if ("auraSeerRevealed" in patch && isBoolean(patch.auraSeerRevealed)) room.auraSeerRevealed = patch.auraSeerRevealed;
  if ("detectivePicks" in patch && isPlayerIdArray(patch.detectivePicks)) room.detectivePicks = patch.detectivePicks;
  if ("detectiveRevealed" in patch && isBoolean(patch.detectiveRevealed)) room.detectiveRevealed = patch.detectiveRevealed;
  if ("witchHealUsed" in patch && isBoolean(patch.witchHealUsed)) room.witchHealUsed = patch.witchHealUsed;
  if ("witchPoisonUsed" in patch && isBoolean(patch.witchPoisonUsed)) room.witchPoisonUsed = patch.witchPoisonUsed;
  if ("witchHealThisRound" in patch && isBoolean(patch.witchHealThisRound)) room.witchHealThisRound = patch.witchHealThisRound;
  if ("witchPoisonTarget" in patch && isNullablePlayerId(patch.witchPoisonTarget)) room.witchPoisonTarget = patch.witchPoisonTarget;
  if ("amorPick" in patch && isPlayerIdArray(patch.amorPick)) room.amorPick = patch.amorPick;
  if ("nightResolved" in patch && isBoolean(patch.nightResolved)) room.nightResolved = patch.nightResolved;
}

export function startGame(room: ServerRoom): void {
  if (room.roomPhase !== "assignment") throw new Error("Das Spiel kann nur nach der Rollenzuweisung gestartet werden.");
  if (room.players.length === 0) throw new Error("Es müssen Spieler im Raum sein.");
  if (room.assignMode === "manual") {
    room.players = mergePublicPlayers(room, assignManualRoles(room.players, room.manualAssign));
  }
  if (room.players.some(player => player.role == null)) throw new Error("Allen Spielern muss eine Rolle zugewiesen sein.");
  room.roomPhase = "roleReveal";
  room.roleReveal = false;
  room.players = room.players.map(player => ({ ...player, roleRevealed: false }));
}

export function startFirstNight(room: ServerRoom): void {
  if (room.roomPhase !== "roleReveal") throw new Error("Die erste Nacht kann erst nach der Rollenaufdeckung gestartet werden.");
  room.roomPhase = "playing";
  room.round = 1;
  room.gamePhase = "night";
  room.log = [{ round: 1, phase: "night", text: "\n--- Runde 1 Nacht ---", time: Date.now() }];
  room.nightResolved = false;
}

export function advanceNightStep(room: ServerRoom): void {
  const steps = nightSteps(room);
  if (room.nightStepIdx >= steps.length - 1) return;
  const currentStep = steps[room.nightStepIdx];
  let wolvesSkippedThisStep = false;
  if (currentStep?.id === "wolves") {
    wolvesSkippedThisStep = room.wolvesSkipNextNight;
    if (wolvesSkippedThisStep) {
      room.wolvesSkipNextNight = false;
      room.nightVictim = null;
      room.urwolfTransform = null;
      addLogText(room, "🦠 Die Werwölfe sind geschwächt und wählen diese Nacht kein Opfer.");
    } else {
      const wolfAttackProtected =
        room.nightVictim !== null &&
        room.nightVictim === room.beschuetzerTarget &&
        room.nightVictim !== room.verfluchterConvertedThisNight;
      const converted = wolfAttackProtected ? null : getWolfAttackConvertedVerfluchter(room.players, room.nightVictim);
      if (converted) {
        room.players = mergePublicPlayers(room, convertPlayerToWerewolf(room.players, converted.id));
        room.verfluchterConvertedThisNight = converted.id;
        addLogText(room, `⛓️ ${converted.name} war verflucht und wird zum Werwolf.`);
      }
    }
  }
  const nextStep = steps[room.nightStepIdx + 1];
  if (!wolvesSkippedThisStep && nextStep?.id === "dawn" && room.harterBurscheWoundedThisNight === null) {
    const wounded = getHarterBurscheWoundedByWolfAttack(room.players, room.nightVictim, {
      nachtgastTarget: room.nachtgastTarget,
      beschuetzerTarget: room.beschuetzerTarget,
      verfluchterConvertedThisNight: room.verfluchterConvertedThisNight,
      urwolfTransform: room.urwolfTransform,
      witchHealThisRound: room.witchHealThisRound,
      harterBurscheWounded: room.harterBurscheWounded,
    });
    if (wounded) {
      room.harterBurscheWounded = wounded.id;
      room.harterBurscheWoundedThisNight = wounded.id;
      addLogText(room, `💪 ${wounded.name} ist der Harte Bursche und überlebt den Angriff zunächst.`);
    }
  }
  room.seerTarget = null;
  room.seerRevealed = false;
  room.auraSeerTarget = null;
  room.auraSeerRevealed = false;
  room.detectivePicks = [];
  room.detectiveRevealed = false;
  room.nightStepIdx += 1;
}

function applyWildesKindConversion(
  room: ServerRoom,
  previousPlayers: ServerRoomPlayer[],
  resolvedPlayers: ServerRoomPlayer[],
): ServerRoomPlayer[] {
  const result = convertWildesKindIfVorbildNewlyDead(previousPlayers, resolvedPlayers, room.wildesKindVorbild);
  if (!result.converted) return resolvedPlayers;
  addLogText(room, `🌿 ${result.converted.name} verliert sein Vorbild und wird heimlich zum Werwolf.`);
  return mergePublicPlayers(room, result.players);
}

export function resolveNight(room: ServerRoom): void {
  let updatedPlayers: ServerRoomPlayer[] = [...room.players];
  const allTriggers: ReturnType<typeof killPlayer>["triggers"] = [];
  const woundedAtNightStart = room.harterBurscheWoundedThisNight === room.harterBurscheWounded
    ? null
    : room.harterBurscheWounded;
  const wolvesSkippedThisNight = room.wolvesSkipNextNight;
  const nightVictim = wolvesSkippedThisNight ? null : room.nightVictim;
  const urwolfTransform = wolvesSkippedThisNight ? null : room.urwolfTransform;
  if (wolvesSkippedThisNight) {
    room.wolvesSkipNextNight = false;
    room.nightVictim = null;
    room.urwolfTransform = null;
    addLogText(room, "🦠 Die Werwölfe sind geschwächt und wählen diese Nacht kein Opfer.");
  }
  const nachtgastMissed = isNachtgastAwayFromWolfAttack(updatedPlayers, nightVictim, room.nachtgastTarget);
  const nachtgastCollateral = getNachtgastCollateralVictim(updatedPlayers, nightVictim, room.nachtgastTarget);
  const wolfAttackProtected =
    nightVictim !== null &&
    nightVictim === room.beschuetzerTarget &&
    nightVictim !== room.verfluchterConvertedThisNight;
  let convertedVerfluchterId = room.verfluchterConvertedThisNight;
  if (convertedVerfluchterId === null && !wolfAttackProtected) {
    const converted = getWolfAttackConvertedVerfluchter(updatedPlayers, nightVictim);
    if (converted) {
      updatedPlayers = mergePublicPlayers(room, convertPlayerToWerewolf(updatedPlayers, converted.id));
      convertedVerfluchterId = converted.id;
      room.verfluchterConvertedThisNight = converted.id;
      addLogText(room, `⛓️ ${converted.name} war verflucht und wird zum Werwolf.`);
    }
  }
  const verfluchterConverted =
    !wolfAttackProtected && convertedVerfluchterId !== null && convertedVerfluchterId === nightVictim;
  const witchHealApplies = room.witchHealThisRound && !verfluchterConverted && !wolfAttackProtected;
  const wolfVictimAlreadyWoundedHarterBursche =
    woundedAtNightStart !== null &&
    nightVictim === woundedAtNightStart &&
    updatedPlayers.some(player => player.id === woundedAtNightStart && player.alive && player.role === "harterbursche");
  const newlyWoundedHarterBursche = room.harterBurscheWoundedThisNight !== null
    ? updatedPlayers.find(player => player.id === room.harterBurscheWoundedThisNight && player.alive) ?? null
    : getHarterBurscheWoundedByWolfAttack(updatedPlayers, nightVictim, {
        nachtgastTarget: room.nachtgastTarget,
        beschuetzerTarget: room.beschuetzerTarget,
        verfluchterConvertedThisNight: convertedVerfluchterId,
        urwolfTransform,
        witchHealThisRound: witchHealApplies,
        harterBurscheWounded: room.harterBurscheWounded,
      });
  if (newlyWoundedHarterBursche && room.harterBurscheWoundedThisNight === null) {
    room.harterBurscheWounded = newlyWoundedHarterBursche.id;
    room.harterBurscheWoundedThisNight = newlyWoundedHarterBursche.id;
    addLogText(room, `💪 ${newlyWoundedHarterBursche.name} ist der Harte Bursche und überlebt den Angriff zunächst.`);
  }

  const killNachtgastCollateral = () => {
    if (!nachtgastCollateral || !updatedPlayers.find(player => player.id === nachtgastCollateral.id)?.alive) return;
    const host = updatedPlayers.find(player => player.id === room.nachtgastTarget);
    addLogText(room, `🛏️ ${nachtgastCollateral.name} wird bei ${host?.name ?? "<unbekannt>"} vom Angriff mitgetroffen.`);
    const result = killPlayer(nachtgastCollateral.id, "Werwölfe", updatedPlayers);
    updatedPlayers = mergePublicPlayers(room, result.players);
    result.logs.forEach(log => addLogText(room, log));
    allTriggers.push(...result.triggers);
  };

  if (wolfAttackProtected) {
    const victim = updatedPlayers.find(player => player.id === nightVictim);
    addLogText(room, `🛡️ Beschützer verhindert den Angriff auf ${victim?.name ?? "<unbekannt>"}.`);
  } else if (verfluchterConverted) {
    killNachtgastCollateral();
  } else if (urwolfTransform && nightVictim !== null) {
    const victim = updatedPlayers.find(player => player.id === nightVictim);
    if (nachtgastMissed) {
      addLogText(room, `🐺 Urwolf findet ${victim?.name ?? "<unbekannt>"} nicht zu Hause.`);
    } else {
      updatedPlayers = updatedPlayers.map(player =>
        player.id === nightVictim ? { ...player, role: "werwolf" as RoleId } : player,
      );
      addLogText(room, `🐺 Urwolf verwandelt ${victim?.name ?? "<unbekannt>"} in einen Werwolf!`);
      room.urwolfUsed = true;
      killNachtgastCollateral();
    }
  } else if (nightVictim !== null && nachtgastMissed) {
    const victim = updatedPlayers.find(player => player.id === nightVictim);
    addLogText(room, `🐺 Die Werwölfe finden ${victim?.name ?? "<unbekannt>"} nicht zu Hause.`);
  } else if (wolfVictimAlreadyWoundedHarterBursche) {
    if (witchHealApplies) {
      const victim = updatedPlayers.find(player => player.id === nightVictim);
      addLogText(room, `🧪 Hexe schützt ${victim?.name ?? "<unbekannt>"} vor dem erneuten Angriff.`);
    }
    killNachtgastCollateral();
  } else if (newlyWoundedHarterBursche) {
    killNachtgastCollateral();
  } else if (nightVictim !== null && !witchHealApplies) {
    const victim = updatedPlayers.find(player => player.id === nightVictim);
    addLogText(room, `🐺 ${victim?.name ?? "<unbekannt>"} wurde von den Werwölfen getötet.`);
    const result = killPlayer(nightVictim, "Werwölfe", updatedPlayers);
    updatedPlayers = mergePublicPlayers(room, result.players);
    result.logs.forEach(log => addLogText(room, log));
    allTriggers.push(...result.triggers);
    if (victim?.role === "verseuchter") {
      room.wolvesSkipNextNight = true;
      addLogText(room, `🦠 ${victim.name} war verseucht. Die Werwölfe müssen in der nächsten Nacht aussetzen.`);
    }
    killNachtgastCollateral();
  } else if (nightVictim !== null && witchHealApplies) {
    const victim = updatedPlayers.find(player => player.id === nightVictim);
    addLogText(room, `🧪 Hexe rettet ${victim?.name ?? "<unbekannt>"} mit dem Heiltrank!`);
    killNachtgastCollateral();
  }
  if (room.witchPoisonTarget !== null) {
    const victim = updatedPlayers.find(player => player.id === room.witchPoisonTarget);
    addLogText(room, `☠️ ${victim?.name ?? "<unbekannt>"} wurde von der Hexe vergiftet.`);
    const result = killPlayer(room.witchPoisonTarget, "Hexe (Gift)", updatedPlayers);
    updatedPlayers = mergePublicPlayers(room, result.players);
    result.logs.forEach(log => addLogText(room, log));
    allTriggers.push(...result.triggers);
  }
  if (woundedAtNightStart !== null) {
    const wounded = updatedPlayers.find(player => player.id === woundedAtNightStart && player.alive);
    if (wounded) {
      addLogText(room, `💪 ${wounded.name} stirbt an den Wunden des Werwolf-Angriffs.`);
      const result = killPlayer(wounded.id, "Harter Bursche", updatedPlayers);
      updatedPlayers = mergePublicPlayers(room, result.players);
      result.logs.forEach(log => addLogText(room, log));
      allTriggers.push(...result.triggers);
    }
  }
  if (witchHealApplies) room.witchHealUsed = true;
  if (room.witchPoisonTarget !== null) room.witchPoisonUsed = true;
  room.beschuetzerLastTarget = room.beschuetzerTarget;
  const trackedWounded = newlyWoundedHarterBursche?.id ?? room.harterBurscheWounded;
  const survivingWounded = clearHarterBurscheWoundForDeadPlayer(updatedPlayers, trackedWounded);
  room.harterBurscheWounded = survivingWounded;
  if (room.harterBurscheWoundedThisNight !== null && survivingWounded !== room.harterBurscheWoundedThisNight) {
    room.harterBurscheWoundedThisNight = null;
  }
  updatedPlayers = applyWildesKindConversion(room, room.players, updatedPlayers);
  room.dayDeaths = updatedPlayers.filter(
    player => !player.alive && room.players.find(previous => previous.id === player.id)?.alive,
  );
  room.nightResolved = true;
  room.players = updatedPlayers;
  if (allTriggers.length > 0) {
    room.triggerQueue = allTriggers;
  } else {
    applyWin(room);
  }
}

export function resolveHunter(room: ServerRoom, targetId: number | null): void {
  const currentTrigger = room.triggerQueue[0];
  if (!currentTrigger || currentTrigger.type !== "hunter") return;
  let updatedPlayers: ServerRoomPlayer[] = [...room.players];
  const remaining = room.triggerQueue.slice(1);
  if (targetId !== null) {
    const target = updatedPlayers.find(player => player.id === targetId);
    addLogText(room, `🎯 Jäger ${currentTrigger.victim} nimmt ${target?.name ?? "<unbekannt>"} mit!`);
    const beforeKill = [...updatedPlayers];
    const result = killPlayer(targetId, "Jäger", updatedPlayers);
    updatedPlayers = mergePublicPlayers(room, result.players);
    result.logs.forEach(log => addLogText(room, log));
    updatedPlayers = applyWildesKindConversion(room, beforeKill, updatedPlayers);
    const newDeaths = updatedPlayers.filter(player => !player.alive && beforeKill.find(previous => previous.id === player.id)?.alive);
    room.dayDeaths = [...room.dayDeaths, ...newDeaths];
    room.harterBurscheWounded = clearHarterBurscheWoundForDeadPlayer(updatedPlayers, room.harterBurscheWounded);
    room.harterBurscheWoundedThisNight = clearHarterBurscheWoundForDeadPlayer(updatedPlayers, room.harterBurscheWoundedThisNight);
    room.players = updatedPlayers;
    room.triggerQueue = [...remaining, ...result.triggers];
  } else {
    addLogText(room, `🎯 Jäger ${currentTrigger.victim} verzichtet.`);
    room.triggerQueue = remaining;
  }
  if (room.triggerQueue.length === 0) applyWin(room);
}

export function startDay(room: ServerRoom): void {
  if (!room.nightResolved) resolveNight(room);
  if (!room.nightResolved) throw new Error("Die Nacht muss zuerst aufgelöst werden.");
  if (room.triggerQueue.length > 0) throw new Error("Alle Nacht-Auslöser müssen zuerst abgehandelt werden.");
  if (room.roomPhase === "ended") return;
  room.gamePhase = "day";
  Object.assign(room, resetNightActions(room));
  room.dayVoteDone = false;
  room.dayVoteVictimId = null;
  room.dayTimer = room.timerDuration;
  room.timerRunning = false;
  addLogText(room, `\n--- Runde ${room.round} Tag ---`, room.round, "day");
}

export function dayVote(room: ServerRoom, playerId: number | undefined): void {
  if (playerId == null) return;
  const player = room.players.find(candidate => candidate.id === playerId);
  if (!player) return;
  room.timerRunning = false;
  if (player.role === "narr") {
    addLogText(room, `🃏 ${player.name} war der Narr! Sondersieg!`);
    room.players = room.players.map(candidate => candidate.id === playerId ? { ...candidate, alive: false } : candidate);
    room.winner = "narr";
    room.roomPhase = "ended";
    return;
  }
  if (player.role === "dorftrottel" && room.round === 1) {
    addLogText(room, `🤡 ${player.name} war der Dorftrottel! Sondersieg in der ersten Runde!`);
    room.players = room.players.map(candidate => candidate.id === playerId ? { ...candidate, alive: false } : candidate);
    room.winner = "dorftrottel";
    room.roomPhase = "ended";
    return;
  }
  addLogText(room, `🗳️ ${player.name} wurde vom Dorf hingerichtet.`);
  const result = killPlayer(playerId, "Abstimmung", room.players);
  result.logs.forEach(log => addLogText(room, log));
  room.players = applyWildesKindConversion(room, room.players, mergePublicPlayers(room, result.players));
  room.harterBurscheWounded = clearHarterBurscheWoundForDeadPlayer(room.players, room.harterBurscheWounded);
  room.harterBurscheWoundedThisNight = clearHarterBurscheWoundForDeadPlayer(room.players, room.harterBurscheWoundedThisNight);
  room.dayVoteDone = true;
  room.dayVoteVictimId = player.id;
  if (result.triggers.length > 0) {
    room.triggerQueue = result.triggers;
  } else {
    applyWin(room);
  }
}

export function startNight(room: ServerRoom): void {
  const newRound = room.round + 1;
  if (room.round === 1) {
    const trottel = room.players.find(player => player.originalRole === "dorftrottel" && player.role === "dorftrottel" && player.alive);
    room.players = room.players.map(player => player.role === "dorftrottel" && player.alive ? { ...player, role: "dorfbewohner" as RoleId } : player);
    if (trottel) addLogText(room, `🤡 ${trottel.name} hat die erste Runde überlebt und wird zum Dorfbewohner.`, newRound, "night");
  }
  room.round = newRound;
  room.gamePhase = "night";
  Object.assign(room, resetNightActions(room));
  room.dayDeaths = [];
  room.dayVoteDone = false;
  room.dayVoteVictimId = null;
  room.timerRunning = false;
  addLogText(room, `\n--- Runde ${newRound} Nacht ---`, newRound, "night");
}

function applyWin(room: ServerRoom): void {
  const urwolfTransformTargetId = getUrwolfTransformTargetId(room);
  const winner = checkWin(room.players, {
    witchHealUsed: room.witchHealUsed,
    witchPoisonUsed: room.witchPoisonUsed,
    winMode: room.winMode,
    getTeamForPlayer: player => getEffectiveTeamForRoom(room, player.id, urwolfTransformTargetId),
  });
  if (winner) {
    room.winner = winner;
    room.roomPhase = "ended";
  }
}

function getUrwolfTransformTargetId(room: ServerRoom): number | null {
  if (room.wolvesSkipNextNight) return null;
  return getUrwolfTransformTarget(room.players, {
    nightVictim: room.nightVictim,
    nachtgastTarget: room.nachtgastTarget,
    beschuetzerTarget: room.beschuetzerTarget,
    verfluchterConvertedThisNight: room.verfluchterConvertedThisNight,
    urwolfTransform: room.urwolfTransform,
  })?.id ?? null;
}

function nightSteps(room: ServerRoom) {
  const urwolfTransformTargetId = getUrwolfTransformTargetId(room);
  return buildNightSteps({
    round: room.round,
    urwolfUsed: room.urwolfUsed,
    witchHealUsed: room.witchHealUsed,
    witchPoisonUsed: room.witchPoisonUsed,
    verfluchterConvertedThisNight: room.verfluchterConvertedThisNight,
    wolvesSkipNextNight: room.wolvesSkipNextNight,
    urwolfTransformTarget: urwolfTransformTargetId,
    harterBurscheWoundedThisNight: room.harterBurscheWoundedThisNight,
    hadRole: roleId => room.players.some(player => player.originalRole === roleId),
    aliveWithRole: roleId => room.players.some(player => player.alive && player.role === roleId),
    amorPick: room.amorPick,
  });
}
