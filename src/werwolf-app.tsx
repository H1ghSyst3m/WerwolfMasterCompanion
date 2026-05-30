import { useState, useCallback, useMemo, useEffect } from "react";
import { useGameState } from "./hooks/useGameState";
import { useNightActions } from "./hooks/useNightActions";
import { useTriggerQueue } from "./hooks/useTriggerQueue";
import { useTimer } from "./hooks/useTimer";
import { useSaveLoad } from "./hooks/useSaveLoad";
import { usePrefs } from "./hooks/usePrefs";
import { buildNightSteps } from "./logic/nightSteps";
import {
  checkWin,
  clearHarterBurscheWoundForDeadPlayer,
  convertPlayerToWerewolf,
  convertWildesKindIfVorbildNewlyDead,
  getHarterBurscheWoundedByWolfAttack,
  getNachtgastCollateralVictim,
  getTeam,
  getUrwolfTransformTarget,
  getWolfAttackConvertedVerfluchter,
  isNachtgastAwayFromWolfAttack,
  killPlayer,
} from "./logic/gameLogic";
import { normalizePersistedPhase } from "./domain/persistedPhase";
import { SetupStep1 } from "./components/setup/SetupStep1";
import { SetupStep2 } from "./components/setup/SetupStep2";
import { SetupStep3 } from "./components/setup/SetupStep3";
import { RoleRevealScreen } from "./components/setup/RoleRevealScreen";
import { NightPhase } from "./components/night/NightPhase";
import { NightReport } from "./components/NightReport";
import { DayPhase } from "./components/day/DayPhase";
import { HunterTrigger } from "./components/HunterTrigger";
import { GameOver } from "./components/GameOver";
import { RestoreScreen } from "./components/RestoreScreen";
import { PlayerOverlay } from "./components/PlayerOverlay";
import { ModeSelection } from "./components/ModeSelection";
import { Modal } from "./components/ui/Modal";
import { OnlineApp } from "./online/OnlineApp";
import type { RoleId, RoleCounts, ManualAssign, SaveState, PersistedPhase, GamePhase, Player } from "./types";

function clearOnlineDeepLinkParams(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete("mode");
  url.searchParams.delete("room");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function LocalGame() {
  const gs = useGameState();
  const na = useNightActions();
  const tq = useTriggerQueue();
  const timer = useTimer();
  const sl = useSaveLoad();
  const prefs = usePrefs();
  const { winMode, revealMode, roleReveal, setWinMode, setRevealMode, setRoleReveal, setPrefs } = prefs;

  const [nameInput, setNameInput] = useState("");
  const [roleCounts, setRoleCounts] = useState<RoleCounts>({ werwolf: 0, dorfbewohner: 0 });
  const [assignMode, setAssignMode] = useState<"random" | "manual" | null>(null);
  const [manualAssign, setManualAssign] = useState<ManualAssign>({});
  const [dayVoteVictim, setDayVoteVictim] = useState<Player | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [roleInfoId, setRoleInfoId] = useState<RoleId | null>(null);

  const urwolfTransformTarget = useMemo(
    () => getUrwolfTransformTarget(gs.players, {
      nightVictim: na.nightVictim,
      nachtgastTarget: na.nachtgastTarget,
      beschuetzerTarget: na.beschuetzerTarget,
      verfluchterConvertedThisNight: na.verfluchterConvertedThisNight,
      urwolfTransform: na.urwolfTransform,
    }),
    [
      gs.players,
      na.nightVictim,
      na.nachtgastTarget,
      na.beschuetzerTarget,
      na.verfluchterConvertedThisNight,
      na.urwolfTransform,
    ],
  );
  const urwolfTransformTargetId = urwolfTransformTarget?.id ?? null;

  const getEffectiveRole = useCallback(
    (playerId: number): RoleId | null | undefined => {
      if (na.verfluchterConvertedThisNight === playerId) return "werwolf";
      if (urwolfTransformTargetId === playerId) return "werwolf";
      return gs.players.find(p => p.id === playerId)?.role;
    },
    [
      gs.players,
      na.verfluchterConvertedThisNight,
      urwolfTransformTargetId,
    ],
  );

  const getEffectiveTeam = useCallback(
    (playerId: number): "wolf" | "village" => getTeam(getEffectiveRole(playerId)),
    [getEffectiveRole],
  );

  const nightSteps = useMemo(
    () => buildNightSteps({
      round: gs.round,
      urwolfUsed: na.urwolfUsed,
      witchHealUsed: na.witchHealUsed,
      witchPoisonUsed: na.witchPoisonUsed,
      verfluchterConvertedThisNight: na.verfluchterConvertedThisNight,
      urwolfTransformTarget: urwolfTransformTargetId,
      harterBurscheWoundedThisNight: na.harterBurscheWoundedThisNight,
      hadRole: gs.hadRole,
      aliveWithRole: gs.aliveWithRole,
      amorPick: na.amorPick,
    }),
    [
      gs.round,
      na.urwolfUsed,
      na.witchHealUsed,
      na.witchPoisonUsed,
      na.verfluchterConvertedThisNight,
      urwolfTransformTargetId,
      na.harterBurscheWoundedThisNight,
      gs.hadRole,
      gs.aliveWithRole,
      na.amorPick,
    ],
  );

  const {
    nightStepIdx, setSeerTarget, setSeerRevealed,
    setAuraSeerTarget, setAuraSeerRevealed,
    setDetectivePicks, setDetectiveRevealed, setNightStepIdx,
  } = na;

  const advanceNightStep = useCallback((urwolfTransformOverride?: boolean | null) => {
    if (nightStepIdx < nightSteps.length - 1) {
      const currentStep = nightSteps[nightStepIdx];
      if (currentStep?.id === "wolves") {
        const wolfAttackProtected =
          na.nightVictim !== null &&
          na.nightVictim === na.beschuetzerTarget &&
          na.nightVictim !== na.verfluchterConvertedThisNight;
        const converted = wolfAttackProtected ? null : getWolfAttackConvertedVerfluchter(gs.players, na.nightVictim);
        if (converted) {
          gs.setPlayers(prev => convertPlayerToWerewolf(prev, converted.id));
          na.setVerfluchterConvertedThisNight(converted.id);
          gs.addLog(`⛓️ ${converted.name} war verflucht und wird zum Werwolf.`);
        }
      }
      const effectiveUrwolfTransform = urwolfTransformOverride ?? na.urwolfTransform;
      const nextStep = nightSteps[nightStepIdx + 1];
      if (nextStep?.id === "dawn" && na.harterBurscheWoundedThisNight === null) {
        const wounded = getHarterBurscheWoundedByWolfAttack(gs.players, na.nightVictim, {
          nachtgastTarget: na.nachtgastTarget,
          beschuetzerTarget: na.beschuetzerTarget,
          verfluchterConvertedThisNight: na.verfluchterConvertedThisNight,
          urwolfTransform: effectiveUrwolfTransform,
          witchHealThisRound: na.witchHealThisRound,
          harterBurscheWounded: na.harterBurscheWounded,
        });
        if (wounded) {
          na.setHarterBurscheWounded(wounded.id);
          na.setHarterBurscheWoundedThisNight(wounded.id);
          gs.addLog(`💪 ${wounded.name} ist der Harte Bursche und überlebt den Angriff zunächst.`);
        }
      }
      setSeerTarget(null); setSeerRevealed(false);
      setAuraSeerTarget(null); setAuraSeerRevealed(false);
      setDetectivePicks([]); setDetectiveRevealed(false);
      setNightStepIdx(prev => prev + 1);
    }
  }, [
    nightStepIdx,
    nightSteps,
    gs,
    na,
    setSeerTarget,
    setSeerRevealed,
    setAuraSeerTarget,
    setAuraSeerRevealed,
    setDetectivePicks,
    setDetectiveRevealed,
    setNightStepIdx,
  ]);

  const applyWildesKindConversion = useCallback((previousPlayers: Player[], resolvedPlayers: Player[]): Player[] => {
    const result = convertWildesKindIfVorbildNewlyDead(previousPlayers, resolvedPlayers, na.wildesKindVorbild);
    if (result.converted) {
      gs.addLog(`🌿 ${result.converted.name} verliert sein Vorbild und wird heimlich zum Werwolf.`);
    }
    return result.players;
  }, [gs, na.wildesKindVorbild]);

  const resolveNight = useCallback(() => {
    const playersAtResolutionStart = gs.players;
    let updatedPlayers = [...gs.players];
    const allTriggers: ReturnType<typeof killPlayer>["triggers"] = [];
    const woundedAtNightStart = na.harterBurscheWoundedThisNight === na.harterBurscheWounded
      ? null
      : na.harterBurscheWounded;
    const nachtgastMissed = isNachtgastAwayFromWolfAttack(updatedPlayers, na.nightVictim, na.nachtgastTarget);
    const nachtgastCollateral = getNachtgastCollateralVictim(updatedPlayers, na.nightVictim, na.nachtgastTarget);
    const wolfAttackProtected =
      na.nightVictim !== null &&
      na.nightVictim === na.beschuetzerTarget &&
      na.nightVictim !== na.verfluchterConvertedThisNight;
    let convertedVerfluchterId = na.verfluchterConvertedThisNight;
    if (convertedVerfluchterId === null && !wolfAttackProtected) {
      const converted = getWolfAttackConvertedVerfluchter(updatedPlayers, na.nightVictim);
      if (converted) {
        updatedPlayers = convertPlayerToWerewolf(updatedPlayers, converted.id);
        convertedVerfluchterId = converted.id;
        na.setVerfluchterConvertedThisNight(converted.id);
        gs.addLog(`⛓️ ${converted.name} war verflucht und wird zum Werwolf.`);
      }
    }
    const verfluchterConverted =
      !wolfAttackProtected && convertedVerfluchterId !== null && convertedVerfluchterId === na.nightVictim;
    const witchHealApplies = na.witchHealThisRound && !verfluchterConverted && !wolfAttackProtected;
    const wolfVictimAlreadyWoundedHarterBursche =
      woundedAtNightStart !== null &&
      na.nightVictim === woundedAtNightStart &&
      updatedPlayers.some(p => p.id === woundedAtNightStart && p.alive && p.role === "harterbursche");
    const newlyWoundedHarterBursche = na.harterBurscheWoundedThisNight !== null
      ? updatedPlayers.find(p => p.id === na.harterBurscheWoundedThisNight && p.alive) ?? null
      : getHarterBurscheWoundedByWolfAttack(updatedPlayers, na.nightVictim, {
          nachtgastTarget: na.nachtgastTarget,
          beschuetzerTarget: na.beschuetzerTarget,
          verfluchterConvertedThisNight: convertedVerfluchterId,
          urwolfTransform: na.urwolfTransform,
          witchHealThisRound: witchHealApplies,
          harterBurscheWounded: na.harterBurscheWounded,
        });
    if (newlyWoundedHarterBursche && na.harterBurscheWoundedThisNight === null) {
      na.setHarterBurscheWounded(newlyWoundedHarterBursche.id);
      na.setHarterBurscheWoundedThisNight(newlyWoundedHarterBursche.id);
      gs.addLog(`💪 ${newlyWoundedHarterBursche.name} ist der Harte Bursche und überlebt den Angriff zunächst.`);
    }

    const killNachtgastCollateral = () => {
      if (!nachtgastCollateral || !updatedPlayers.find(p => p.id === nachtgastCollateral.id)?.alive) return;
      const host = updatedPlayers.find(p => p.id === na.nachtgastTarget);
      gs.addLog(`🛏️ ${nachtgastCollateral.name} wird bei ${host?.name ?? "<unbekannt>"} vom Angriff mitgetroffen.`);
      const r = killPlayer(nachtgastCollateral.id, "Werwölfe", updatedPlayers);
      updatedPlayers = r.players; r.logs.forEach(l => gs.addLog(l)); allTriggers.push(...r.triggers);
    };

    if (wolfAttackProtected) {
      const v = updatedPlayers.find(p => p.id === na.nightVictim);
      gs.addLog(`🛡️ Beschützer verhindert den Angriff auf ${v?.name ?? "<unbekannt>"}.`);
    } else if (verfluchterConverted) {
      killNachtgastCollateral();
    } else if (na.urwolfTransform && na.nightVictim !== null) {
      const v = updatedPlayers.find(p => p.id === na.nightVictim);
      if (nachtgastMissed) {
        gs.addLog(`🐺 Urwolf findet ${v?.name ?? "<unbekannt>"} nicht zu Hause.`);
      } else {
        updatedPlayers = updatedPlayers.map(p =>
          p.id === na.nightVictim ? { ...p, role: "werwolf" as RoleId } : p,
        );
        gs.addLog(`🐺 Urwolf verwandelt ${v?.name ?? "<unbekannt>"} in einen Werwolf!`);
        na.setUrwolfUsed(true);
        killNachtgastCollateral();
      }
    } else if (na.nightVictim !== null && nachtgastMissed) {
      const v = updatedPlayers.find(p => p.id === na.nightVictim);
      gs.addLog(`🐺 Die Werwölfe finden ${v?.name ?? "<unbekannt>"} nicht zu Hause.`);
    } else if (wolfVictimAlreadyWoundedHarterBursche) {
      if (witchHealApplies) {
        const v = updatedPlayers.find(p => p.id === na.nightVictim);
        gs.addLog(`🧪 Hexe schützt ${v?.name ?? "<unbekannt>"} vor dem erneuten Angriff.`);
      }
      killNachtgastCollateral();
    } else if (newlyWoundedHarterBursche) {
      killNachtgastCollateral();
    } else if (na.nightVictim !== null && !witchHealApplies) {
      const v = updatedPlayers.find(p => p.id === na.nightVictim);
      gs.addLog(`🐺 ${v?.name ?? "<unbekannt>"} wurde von den Werwölfen getötet.`);
      const r = killPlayer(na.nightVictim, "Werwölfe", updatedPlayers);
      updatedPlayers = r.players; r.logs.forEach(l => gs.addLog(l)); allTriggers.push(...r.triggers);
      killNachtgastCollateral();
    } else if (na.nightVictim !== null && witchHealApplies) {
      const v = updatedPlayers.find(p => p.id === na.nightVictim);
      gs.addLog(`🧪 Hexe rettet ${v?.name ?? "<unbekannt>"} mit dem Heiltrank!`);
      killNachtgastCollateral();
    }

    if (na.witchPoisonTarget !== null) {
      const v = updatedPlayers.find(p => p.id === na.witchPoisonTarget);
      gs.addLog(`☠️ ${v?.name ?? "<unbekannt>"} wurde von der Hexe vergiftet.`);
      const r = killPlayer(na.witchPoisonTarget, "Hexe (Gift)", updatedPlayers);
      updatedPlayers = r.players; r.logs.forEach(l => gs.addLog(l)); allTriggers.push(...r.triggers);
    }

    if (woundedAtNightStart !== null) {
      const wounded = updatedPlayers.find(p => p.id === woundedAtNightStart && p.alive);
      if (wounded) {
        gs.addLog(`💪 ${wounded.name} stirbt an den Wunden des Werwolf-Angriffs.`);
        const r = killPlayer(wounded.id, "Harter Bursche", updatedPlayers);
        updatedPlayers = r.players; r.logs.forEach(l => gs.addLog(l)); allTriggers.push(...r.triggers);
      }
    }

    if (witchHealApplies) na.setWitchHealUsed(true);
    if (na.witchPoisonTarget !== null) na.setWitchPoisonUsed(true);
    na.setBeschuetzerLastTarget(na.beschuetzerTarget);
    const trackedWounded = newlyWoundedHarterBursche?.id ?? na.harterBurscheWounded;
    const survivingWounded = clearHarterBurscheWoundForDeadPlayer(updatedPlayers, trackedWounded);
    na.setHarterBurscheWounded(survivingWounded);
    if (na.harterBurscheWoundedThisNight !== null && survivingWounded !== na.harterBurscheWoundedThisNight) {
      na.setHarterBurscheWoundedThisNight(null);
    }

    updatedPlayers = applyWildesKindConversion(playersAtResolutionStart, updatedPlayers);

    const allDead = updatedPlayers.filter(
      p => !p.alive && gs.players.find(pp => pp.id === p.id)?.alive,
    );
    gs.setDayDeaths(allDead); na.setNightResolved(true); gs.setPlayers(updatedPlayers);

    if (allTriggers.length > 0) {
      tq.setTriggerQueue(allTriggers);
    } else {
      const effectiveHealUsed = na.witchHealUsed || witchHealApplies;
      const effectivePoisonUsed = na.witchPoisonUsed || (na.witchPoisonTarget !== null);
      const w = checkWin(updatedPlayers, {
        witchHealUsed: effectiveHealUsed,
        witchPoisonUsed: effectivePoisonUsed,
        winMode,
      });
      if (w) { gs.setWinner(w); gs.setPhase("ended"); }
    }
  }, [gs, na, tq, winMode, applyWildesKindConversion]);

  const resolveHunter = useCallback(
    (targetId: number | null) => {
      if (!tq.currentTrigger || tq.currentTrigger.type !== "hunter") return;
      let updatedPlayers = [...gs.players];
      const remaining = tq.triggerQueue.slice(1);
      if (targetId !== null) {
        const t = updatedPlayers.find(p => p.id === targetId);
        gs.addLog(`🎯 Jäger ${tq.currentTrigger.victim} nimmt ${t?.name ?? "<unbekannt>"} mit!`);
        const beforeKill = [...updatedPlayers];
        const result = killPlayer(targetId, "Jäger", updatedPlayers);
        updatedPlayers = result.players;
        result.logs.forEach(l => gs.addLog(l));
        updatedPlayers = applyWildesKindConversion(beforeKill, updatedPlayers);
        const newDeaths = updatedPlayers.filter(p => !p.alive && beforeKill.find(pp => pp.id === p.id)?.alive);
        gs.setDayDeaths([...gs.dayDeaths, ...newDeaths]);
        na.setHarterBurscheWounded(clearHarterBurscheWoundForDeadPlayer(updatedPlayers, na.harterBurscheWounded));
        na.setHarterBurscheWoundedThisNight(clearHarterBurscheWoundForDeadPlayer(updatedPlayers, na.harterBurscheWoundedThisNight));
        const allTriggers = [...remaining, ...result.triggers];
        gs.setPlayers(updatedPlayers);
        if (allTriggers.length > 0) {
          tq.setTriggerQueue(allTriggers);
        } else {
          tq.setTriggerQueue([]);
          const w = checkWin(updatedPlayers, {
            witchHealUsed: na.witchHealUsed,
            witchPoisonUsed: na.witchPoisonUsed,
            winMode,
          });
          if (w) { gs.setWinner(w); gs.setPhase("ended"); }
        }
      } else {
        gs.addLog(`🎯 Jäger ${tq.currentTrigger.victim} verzichtet.`);
        tq.setTriggerQueue(remaining);
        if (remaining.length === 0) {
          const w = checkWin(updatedPlayers, {
            witchHealUsed: na.witchHealUsed,
            witchPoisonUsed: na.witchPoisonUsed,
            winMode,
          });
          if (w) { gs.setWinner(w); gs.setPhase("ended"); }
        }
      }
    },
    [tq, gs, na, winMode, applyWildesKindConversion],
  );

  const handleDayVote = useCallback(
    (pid: number) => {
      const p = gs.players.find(x => x.id === pid);
      if (!p) return;
      timer.setTimerRunning(false);
      if (p.role === "narr") {
        gs.addLog(`🃏 ${p.name} war der Narr! Sondersieg!`);
        gs.setPlayers(prev => prev.map(pl => pl.id === pid ? { ...pl, alive: false } : pl));
        gs.setWinner("narr"); gs.setPhase("ended"); return;
      }
      if (p.role === "dorftrottel" && gs.round === 1) {
        gs.addLog(`🤡 ${p.name} war der Dorftrottel! Sondersieg in der ersten Runde!`);
        gs.setPlayers(prev => prev.map(pl => pl.id === pid ? { ...pl, alive: false } : pl));
        gs.setWinner("dorftrottel"); gs.setPhase("ended"); return;
      }
      gs.addLog(`🗳️ ${p.name} wurde vom Dorf hingerichtet.`);
      const result = killPlayer(pid, "Abstimmung", gs.players);
      result.logs.forEach(l => gs.addLog(l));
      const updatedPlayers = applyWildesKindConversion(gs.players, result.players);
      gs.setPlayers(updatedPlayers);
      na.setHarterBurscheWounded(clearHarterBurscheWoundForDeadPlayer(updatedPlayers, na.harterBurscheWounded));
      na.setHarterBurscheWoundedThisNight(clearHarterBurscheWoundForDeadPlayer(updatedPlayers, na.harterBurscheWoundedThisNight));
      gs.setDayVoteDone(true);
      setDayVoteVictim(p);
      if (result.triggers.length > 0) {
        tq.setTriggerQueue(result.triggers);
      } else {
        const w = checkWin(updatedPlayers, {
          witchHealUsed: na.witchHealUsed,
          witchPoisonUsed: na.witchPoisonUsed,
          winMode,
        });
        if (w) { gs.setWinner(w); gs.setPhase("ended"); }
      }
    },
    [gs, tq, timer, na, winMode, applyWildesKindConversion],
  );

  const startDay = useCallback(() => {
    gs.setGamePhase("day"); na.resetNightActions();
    gs.setDayDeaths([]); gs.setDayVoteDone(false); gs.setVoteConfirm(null);
    timer.setDayTimer(timer.timerDuration); timer.setTimerRunning(false);
    gs.addLog(`\n--- Runde ${gs.round} Tag ---`, gs.round, "day");
  }, [gs, na, timer]);

  const startNight = useCallback(() => {
    const newRound = gs.round + 1;
    if (gs.round === 1) {
      const trottel = gs.players.find(
        p => p.originalRole === "dorftrottel" && p.role === "dorftrottel" && p.alive,
      );
      gs.setPlayers(prev =>
        prev.map(p => p.role === "dorftrottel" && p.alive ? { ...p, role: "dorfbewohner" as RoleId } : p),
      );
      if (trottel) {
        gs.addLog(`🤡 ${trottel.name} hat die erste Runde überlebt und wird zum Dorfbewohner.`, newRound, "night");
      }
    }
    gs.setRound(newRound); gs.setGamePhase("night"); na.resetNightActions();
    gs.setDayVoteDone(false); gs.setVoteConfirm(null); setDayVoteVictim(null); timer.setTimerRunning(false);
    gs.addLog(`\n--- Runde ${newRound} Nacht ---`, newRound, "night");
  }, [gs, na, timer]);

  const addPlayer = () => {
    const n = nameInput.trim();
    if (!n || gs.players.some(p => p.name === n)) return;
    gs.setPlayers(prev => [
      ...prev,
      { id: Date.now(), name: n, role: null, originalRole: null, alive: true, lover: null },
    ]);
    setNameInput("");
  };

  const removePlayer = (id: number) => gs.setPlayers(prev => prev.filter(p => p.id !== id));

  const shuffleRoles = useCallback(() => {
    const pool: RoleId[] = [];
    (Object.entries(roleCounts) as [RoleId, number][]).forEach(([r, c]) => {
      for (let i = 0; i < c; i++) pool.push(r);
    });
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    gs.setPlayers(prev => prev.map((p, i) => ({ ...p, role: pool[i], originalRole: pool[i] })));
  }, [roleCounts, gs]);

  const startFirstNight = useCallback(() => {
    gs.setPhase("playing"); gs.setGamePhase("night"); gs.setRound(1);
    gs.setLog([{ round: 1, phase: "night", text: "\n--- Runde 1 Nacht ---", time: Date.now() }]);
  }, [gs]);

  const startGame = useCallback(() => {
    const assigned = gs.players.map(p => {
      const finalRole = manualAssign[p.id] ?? p.role;
      return { ...p, role: finalRole, originalRole: finalRole };
    });
    gs.setPlayers(assigned);
    if (roleReveal) {
      gs.setPhase("roleReveal");
    } else {
      startFirstNight();
    }
  }, [gs, manualAssign, roleReveal, startFirstNight]);

  const buildSaveState = useCallback((): SaveState => ({
    schemaVersion: 2,
    phase: gs.phase as PersistedPhase,
    setupStep: gs.setupStep,
    players: gs.players,
    roleCounts,
    assignMode,
    manualAssign,
    round: gs.round,
    gamePhase: gs.gamePhase,
    nightStepIdx: na.nightStepIdx,
    nightVictim: na.nightVictim,
    nachtgastTarget: na.nachtgastTarget,
    beschuetzerTarget: na.beschuetzerTarget,
    beschuetzerLastTarget: na.beschuetzerLastTarget,
    wildesKindVorbild: na.wildesKindVorbild,
    verfluchterConvertedThisNight: na.verfluchterConvertedThisNight,
    harterBurscheWounded: na.harterBurscheWounded,
    harterBurscheWoundedThisNight: na.harterBurscheWoundedThisNight,
    urwolfTransform: na.urwolfTransform,
    urwolfUsed: na.urwolfUsed,
    seerTarget: na.seerTarget,
    seerRevealed: na.seerRevealed,
    auraSeerTarget: na.auraSeerTarget,
    auraSeerRevealed: na.auraSeerRevealed,
    detectivePicks: na.detectivePicks,
    detectiveRevealed: na.detectiveRevealed,
    witchHealUsed: na.witchHealUsed,
    witchPoisonUsed: na.witchPoisonUsed,
    witchHealThisRound: na.witchHealThisRound,
    witchPoisonTarget: na.witchPoisonTarget,
    amorPick: na.amorPick,
    nightResolved: na.nightResolved,
    dayDeaths: gs.dayDeaths,
    dayVoteDone: gs.dayVoteDone,
    dayVoteVictimId: dayVoteVictim?.id ?? null,
    triggerQueue: tq.triggerQueue,
    log: gs.log,
    winner: gs.winner,
    winMode,
    revealMode,
    roleReveal,
    timerDuration: timer.timerDuration,
    dayTimer: timer.dayTimerRef.current,
  }), [gs, na, tq, timer, roleCounts, assignMode, manualAssign, winMode, revealMode, roleReveal, dayVoteVictim]);

  const restoreState = useCallback((s: SaveState) => {
    const restoredPhase = normalizePersistedPhase(s.phase);
    if (!restoredPhase) return;
    gs.setPhase(restoredPhase); gs.setSetupStep(s.setupStep); gs.setPlayers(s.players);
    setRoleCounts(s.roleCounts); setAssignMode(s.assignMode); setManualAssign(s.manualAssign);
    gs.setRound(s.round); gs.setGamePhase(s.gamePhase as GamePhase);
    na.setNightStepIdx(s.nightStepIdx);
    na.setNightVictim(s.nightVictim); na.setUrwolfTransform(s.urwolfTransform); na.setUrwolfUsed(s.urwolfUsed);
    na.setNachtgastTarget(s.nachtgastTarget ?? null);
    na.setBeschuetzerTarget(s.beschuetzerTarget ?? null);
    na.setBeschuetzerLastTarget(s.beschuetzerLastTarget ?? null);
    na.setWildesKindVorbild(s.wildesKindVorbild ?? null);
    na.setVerfluchterConvertedThisNight(s.verfluchterConvertedThisNight ?? null);
    na.setHarterBurscheWounded(s.harterBurscheWounded ?? null);
    na.setHarterBurscheWoundedThisNight(s.harterBurscheWoundedThisNight ?? null);
    na.setSeerTarget(s.seerTarget); na.setSeerRevealed(s.seerRevealed);
    na.setAuraSeerTarget(s.auraSeerTarget); na.setAuraSeerRevealed(s.auraSeerRevealed);
    na.setDetectivePicks(s.detectivePicks); na.setDetectiveRevealed(s.detectiveRevealed);
    na.setWitchHealUsed(s.witchHealUsed); na.setWitchPoisonUsed(s.witchPoisonUsed);
    na.setWitchHealThisRound(s.witchHealThisRound); na.setWitchPoisonTarget(s.witchPoisonTarget);
    na.setAmorPick(s.amorPick); na.setNightResolved(s.nightResolved);
    gs.setDayDeaths(s.dayDeaths); gs.setDayVoteDone(s.dayVoteDone);
    tq.setTriggerQueue(s.triggerQueue); gs.setLog(s.log);
    gs.setWinner(s.winner); setPrefs({ winMode: s.winMode, revealMode: s.revealMode, roleReveal: s.roleReveal }); timer.setTimerDuration(s.timerDuration);
    timer.setDayTimer(s.dayTimer);
    timer.setTimerRunning(false); gs.setVoteConfirm(null);
    setDayVoteVictim(s.dayVoteVictimId !== null ? (s.players.find(p => p.id === s.dayVoteVictimId) ?? null) : null);
    setShowLog(false); setShowPlayers(false);
  }, [gs, na, tq, timer, setPrefs]);

  const { loaded: slLoaded, saveGame: slSaveGame } = sl;

  useEffect(() => {
    if (!slLoaded) return;
    if (gs.phase === "roleReveal" || gs.phase === "playing" || gs.phase === "ended") {
      const t = setTimeout(() => slSaveGame(buildSaveState()), 500);
      return () => clearTimeout(t);
    }
  }, [
    slLoaded, gs.phase, gs.players, gs.round, gs.gamePhase,
    na.nightStepIdx, na.nightVictim, na.urwolfTransform, na.urwolfUsed,
    na.nachtgastTarget, na.beschuetzerTarget, na.beschuetzerLastTarget, na.wildesKindVorbild,
    na.verfluchterConvertedThisNight,
    na.harterBurscheWounded, na.harterBurscheWoundedThisNight,
    na.witchHealUsed, na.witchPoisonUsed, na.witchHealThisRound,
    na.witchPoisonTarget, na.nightResolved, gs.dayDeaths, gs.dayVoteDone,
    tq.triggerQueue, gs.log, gs.winner,
    slSaveGame, buildSaveState,
  ]);

  const resetGame = (keepPlayers = false) => {
    const savedPlayers = keepPlayers
      ? gs.players.map(p => ({ ...p, role: null, originalRole: null, alive: true, lover: null }))
      : [];
    prefs.reset();
    gs.setPhase("setup"); gs.setSetupStep(1); gs.setPlayers(savedPlayers); setNameInput("");
    setRoleCounts({ werwolf: 0, dorfbewohner: 0 }); setAssignMode(null); setManualAssign({});
    gs.setRound(1); gs.setGamePhase("night"); na.resetNightActions();
    na.setUrwolfUsed(false); na.setWitchHealUsed(false); na.setWitchPoisonUsed(false);
    na.setBeschuetzerLastTarget(null); na.setHarterBurscheWounded(null); na.setHarterBurscheWoundedThisNight(null);
    na.setWildesKindVorbild(null); na.setAmorPick([]); gs.setLog([]); tq.setTriggerQueue([]);
    gs.setWinner(null); timer.setDayTimer(0); timer.setTimerRunning(false); timer.setTimerDuration(300);
    gs.setDayDeaths([]); gs.setDayVoteDone(false); gs.setVoteConfirm(null); setDayVoteVictim(null);
    setShowLog(false); setShowPlayers(false); setRoleInfoId(null); sl.deleteSave();
  };

  if (!sl.loaded) return (
    <div className="h-full bg-gray-950 text-white flex items-center justify-center">
      <div className="text-center"><div className="text-5xl mb-4">🐺</div><p className="text-gray-400">Lade...</p></div>
    </div>
  );

  if (sl.showRestore && sl.pendingRestore) return (
    <RestoreScreen
      pendingRestore={sl.pendingRestore}
      onRestore={() => { restoreState(sl.pendingRestore!); sl.setShowRestore(false); sl.setPendingRestore(null); }}
      onDiscard={() => { sl.setShowRestore(false); sl.setPendingRestore(null); sl.deleteSave(); }}
    />
  );

  if (gs.phase === "setup") {
    if (gs.setupStep === 1) return (
      <SetupStep1
        players={gs.players} nameInput={nameInput} setNameInput={setNameInput}
        addPlayer={addPlayer} removePlayer={removePlayer} onNext={() => gs.setSetupStep(2)}
        clearPlayers={() => gs.setPlayers([])}
      />
    );
    if (gs.setupStep === 2) return (
      <SetupStep2
        players={gs.players} roleCounts={roleCounts} setRoleCounts={setRoleCounts}
        roleInfoId={roleInfoId} setRoleInfoId={setRoleInfoId}
        winMode={winMode} setWinMode={setWinMode}
        revealMode={revealMode} setRevealMode={setRevealMode}
        roleReveal={roleReveal} setRoleReveal={setRoleReveal}
        onBack={() => gs.setSetupStep(1)}
        onNext={() => { setManualAssign({}); setAssignMode(null); gs.setSetupStep(3); }}
      />
    );
    if (gs.setupStep === 3) return (
      <SetupStep3
        players={gs.players} roleCounts={roleCounts} assignMode={assignMode}
        manualAssign={manualAssign} setAssignMode={setAssignMode} setManualAssign={setManualAssign}
        setPlayers={gs.setPlayers} shuffleRoles={shuffleRoles} startGame={startGame}
        onBack={() => gs.setSetupStep(2)}
      />
    );
  }

  if (gs.phase === "roleReveal") return (
    <RoleRevealScreen
      players={gs.players}
      onDone={startFirstNight}
    />
  );

  if (gs.phase === "ended" && gs.winner) return (
    <GameOver winner={gs.winner} round={gs.round} players={gs.players} log={gs.log} onReset={resetGame} />
  );

  const isNight = gs.gamePhase === "night";
  const bgClass = isNight
    ? "bg-gradient-to-b from-indigo-950 to-gray-950"
    : "bg-gradient-to-b from-amber-950/30 to-gray-950";

  return (
    <div className={`h-full flex flex-col ${bgClass} text-white`}>
      <div className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div>
            <span className="text-lg font-bold">{isNight ? "🌙" : "☀️"} Runde {gs.round}</span>
            <span className="text-gray-400 text-sm ml-2">{isNight ? "Nacht" : "Tag"}</span>
          </div>
          <div className="flex gap-2">
            <button aria-label="Spieler anzeigen" onClick={() => setShowPlayers(true)} className="px-3 py-1.5 bg-gray-800 rounded-lg text-sm">👥</button>
            <button aria-label="Spielprotokoll anzeigen" onClick={() => setShowLog(true)} className="px-3 py-1.5 bg-gray-800 rounded-lg text-sm">📜</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 max-w-md mx-auto w-full">
        {tq.currentTrigger?.type === "hunter" && (
          <HunterTrigger currentTrigger={tq.currentTrigger} players={gs.players} resolveHunter={resolveHunter} />
        )}
        {showPlayers && (
          <PlayerOverlay
            players={gs.players} roleInfoId={roleInfoId} setRoleInfoId={setRoleInfoId}
            onClose={() => { setShowPlayers(false); setRoleInfoId(null); }}
          />
        )}
        {showLog && (
          <Modal onClose={() => setShowLog(false)}>
            <h2 className="text-lg font-bold mb-3">📜 Spielprotokoll</h2>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {gs.log.map((l, i) => (
                <p key={i} className={`text-sm ${l.text.startsWith("\n") ? "text-gray-400 font-semibold mt-2" : "text-gray-300"}`}>
                  {l.text}
                </p>
              ))}
            </div>
            <button onClick={() => setShowLog(false)} className="font-semibold rounded-xl transition-all active:scale-95 px-4 py-3 text-base bg-gray-700 text-white w-full mt-4">Schließen</button>
          </Modal>
        )}

        {isNight && !na.nightResolved && (
          <NightPhase
            nightSteps={nightSteps} nightStepIdx={na.nightStepIdx}
            advanceNightStep={advanceNightStep} resolveNight={resolveNight}
            players={gs.players} alive={gs.alive}
            nightVictim={na.nightVictim} setNightVictim={na.setNightVictim}
            nachtgastTarget={na.nachtgastTarget} setNachtgastTarget={na.setNachtgastTarget}
            beschuetzerTarget={na.beschuetzerTarget}
            beschuetzerLastTarget={na.beschuetzerLastTarget}
            setBeschuetzerTarget={na.setBeschuetzerTarget}
            wildesKindVorbild={na.wildesKindVorbild}
            setWildesKindVorbild={na.setWildesKindVorbild}
            verfluchterConvertedThisNight={na.verfluchterConvertedThisNight}
            harterBurscheWoundedThisNight={na.harterBurscheWoundedThisNight}
            urwolfTransformTarget={urwolfTransformTargetId}
            urwolfTransform={na.urwolfTransform} setUrwolfTransform={na.setUrwolfTransform}
            seerTarget={na.seerTarget} setSeerTarget={na.setSeerTarget}
            seerRevealed={na.seerRevealed} setSeerRevealed={na.setSeerRevealed}
            auraSeerTarget={na.auraSeerTarget} setAuraSeerTarget={na.setAuraSeerTarget}
            auraSeerRevealed={na.auraSeerRevealed} setAuraSeerRevealed={na.setAuraSeerRevealed}
            detectivePicks={na.detectivePicks} setDetectivePicks={na.setDetectivePicks}
            detectiveRevealed={na.detectiveRevealed} setDetectiveRevealed={na.setDetectiveRevealed}
            witchHealUsed={na.witchHealUsed} witchPoisonUsed={na.witchPoisonUsed}
            witchHealThisRound={na.witchHealThisRound} setWitchHealThisRound={na.setWitchHealThisRound}
            witchPoisonTarget={na.witchPoisonTarget} setWitchPoisonTarget={na.setWitchPoisonTarget}
            amorPick={na.amorPick} setAmorPick={na.setAmorPick}
            setPlayers={gs.setPlayers}
            getEffectiveRole={getEffectiveRole} getEffectiveTeam={getEffectiveTeam}
            addLog={gs.addLog}
          />
        )}

        {isNight && na.nightResolved && tq.triggerQueue.length === 0 && gs.phase === "playing" && (
          <NightReport dayDeaths={gs.dayDeaths} startDay={startDay} />
        )}

        {!isNight && (
          <DayPhase
            alive={gs.alive} dayVoteDone={gs.dayVoteDone}
            voteConfirm={gs.voteConfirm} setVoteConfirm={gs.setVoteConfirm}
            triggerQueueLength={tq.triggerQueue.length}
            dayTimer={timer.dayTimer} timerRunning={timer.timerRunning} timerDuration={timer.timerDuration}
            setTimerRunning={timer.setTimerRunning} setDayTimer={timer.setDayTimer}
            setTimerDuration={timer.setTimerDuration} formatTime={timer.formatTime}
            handleDayVote={handleDayVote} startNight={startNight}
            revealMode={revealMode} dayVoteVictim={dayVoteVictim}
          />
        )}
      </div>

      <div className="sticky bottom-0 bg-gray-950/95 backdrop-blur border-t border-gray-800 px-4 py-3">
        <div className="flex justify-around max-w-md mx-auto text-center text-sm">
          <div><span className="text-green-400 font-bold text-lg">{gs.alive.length}</span><br /><span className="text-gray-500">Am Leben</span></div>
          <div><span className="text-red-400 font-bold text-lg">{gs.wolvesAlive.length}</span><br /><span className="text-gray-500">Wölfe</span></div>
          <div><span className="text-blue-400 font-bold text-lg">{gs.villageAlive.length}</span><br /><span className="text-gray-500">Dorf</span></div>
          <div><span className="text-gray-400 font-bold text-lg">{gs.players.length - gs.alive.length}</span><br /><span className="text-gray-500">Tot</span></div>
        </div>
      </div>
    </div>
  );
}

export default function WerwolfApp() {
  const initialOnlineRoomCode = new URLSearchParams(window.location.search).get("room")?.trim().toUpperCase() ?? "";
  const initialMode = new URLSearchParams(window.location.search).get("mode") === "online" || initialOnlineRoomCode
    ? "online"
    : null;
  const [mode, setMode] = useState<"local" | "online" | null>(initialMode);

  if (mode === "local") return <LocalGame />;
  if (mode === "online") return <OnlineApp initialRoomCode={initialOnlineRoomCode} onBack={() => {
    clearOnlineDeepLinkParams();
    setMode(null);
  }} />;
  return <ModeSelection onSelectMode={setMode} />;
}
