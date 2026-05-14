import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { buildNightSteps } from "../logic/nightSteps";
import { getTeam, isNachtgastAwayFromWolfAttack } from "../logic/gameLogic";
import { SetupStep2 } from "../components/setup/SetupStep2";
import { SetupStep3 } from "../components/setup/SetupStep3";
import { NightPhase } from "../components/night/NightPhase";
import { NightReport } from "../components/NightReport";
import { DayPhase } from "../components/day/DayPhase";
import { HunterTrigger } from "../components/HunterTrigger";
import { GameOver } from "../components/GameOver";
import { PlayerOverlay } from "../components/PlayerOverlay";
import { Modal } from "../components/ui/Modal";
import { Btn } from "../components/ui/Btn";
import { OnlineLobby } from "../components/online/OnlineLobby";
import type { OnlineGmSnapshot } from "./messages";
import type { ClientCommand } from "./messages";
import type { ManualAssign, Player, Prefs, RoleCounts, RoleId } from "../types";

interface OnlineGmControllerProps {
  snapshot: OnlineGmSnapshot;
  sendCommand: (command: ClientCommand) => void;
}

function resolveValue<T>(value: SetStateAction<T>, current: T): T {
  return typeof value === "function" ? (value as (previous: T) => T)(current) : value;
}

interface OnlineGmDraft {
  roleCounts: RoleCounts;
  manualAssign: ManualAssign;
  players: Player[];
  detectivePicks: number[];
  witchPoisonTarget: number | null;
  amorPick: number[];
}

function snapshotToDraft(snapshot: OnlineGmSnapshot): OnlineGmDraft {
  return {
    roleCounts: snapshot.roleCounts,
    manualAssign: snapshot.manualAssign,
    players: snapshot.players.map(player => ({
      id: player.id,
      name: player.name,
      role: player.role,
      originalRole: player.originalRole,
      alive: player.alive,
      lover: player.lover,
    })),
    detectivePicks: snapshot.detectivePicks,
    witchPoisonTarget: snapshot.witchPoisonTarget,
    amorPick: snapshot.amorPick,
  };
}

function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function OnlineGmController({ snapshot, sendCommand }: OnlineGmControllerProps) {
  const [roleInfoId, setRoleInfoId] = useState<RoleId | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [voteConfirm, setVoteConfirm] = useState<Player | null>(null);
  const draftRef = useRef<OnlineGmDraft>(snapshotToDraft(snapshot));

  useEffect(() => {
    draftRef.current = snapshotToDraft(snapshot);
  }, [snapshot]);

  const resolveDraftValue = useCallback(<K extends keyof OnlineGmDraft>(
    key: K,
    value: SetStateAction<OnlineGmDraft[K]>,
  ): OnlineGmDraft[K] => {
    const resolved = resolveValue(value, draftRef.current[key]);
    draftRef.current = { ...draftRef.current, [key]: resolved };
    return resolved;
  }, []);

  const players = snapshot.players;
  const getEffectiveRole = useCallback(
    (playerId: number): RoleId | null | undefined => {
      const nachtgastMissed = isNachtgastAwayFromWolfAttack(players, snapshot.nightVictim, snapshot.nachtgastTarget);
      const wolfAttackProtected =
        snapshot.nightVictim !== null &&
        snapshot.nightVictim === snapshot.beschuetzerTarget &&
        snapshot.nightVictim !== snapshot.verfluchterConvertedThisNight;
      if (snapshot.verfluchterConvertedThisNight === playerId) return "werwolf";
      if (snapshot.urwolfTransform && snapshot.nightVictim === playerId && !nachtgastMissed && !wolfAttackProtected) {
        return "werwolf";
      }
      return players.find(player => player.id === playerId)?.role;
    },
    [
      players,
      snapshot.verfluchterConvertedThisNight,
      snapshot.urwolfTransform,
      snapshot.nightVictim,
      snapshot.nachtgastTarget,
      snapshot.beschuetzerTarget,
    ],
  );

  const getEffectiveTeam = useCallback(
    (playerId: number): "wolf" | "village" => getTeam(getEffectiveRole(playerId)),
    [getEffectiveRole],
  );

  const alive = useMemo(() => players.filter(player => player.alive), [players]);
  const wolvesAlive = useMemo(
    () => alive.filter(player => getEffectiveTeam(player.id) === "wolf"),
    [alive, getEffectiveTeam],
  );
  const villageAlive = useMemo(
    () => alive.filter(player => getEffectiveTeam(player.id) !== "wolf"),
    [alive, getEffectiveTeam],
  );

  const nightSteps = useMemo(
    () => buildNightSteps({
      round: snapshot.round,
      urwolfUsed: snapshot.urwolfUsed,
      witchHealUsed: snapshot.witchHealUsed,
      witchPoisonUsed: snapshot.witchPoisonUsed,
      verfluchterConvertedThisNight: snapshot.verfluchterConvertedThisNight,
      hadRole: roleId => players.some(player => player.originalRole === roleId),
      aliveWithRole: roleId => players.some(player => player.alive && getEffectiveRole(player.id) === roleId),
      amorPick: snapshot.amorPick,
    }),
    [
      snapshot.round,
      snapshot.urwolfUsed,
      snapshot.witchHealUsed,
      snapshot.witchPoisonUsed,
      snapshot.verfluchterConvertedThisNight,
      snapshot.amorPick,
      players,
      getEffectiveRole,
    ],
  );

  const updateNightAction = useCallback(
    (payload: Extract<ClientCommand, { type: "gm:updateNightAction" }>["payload"]) => {
      sendCommand({ type: "gm:updateNightAction", payload });
    },
    [sendCommand],
  );

  const setRoleCounts: Dispatch<SetStateAction<RoleCounts>> = useCallback(
    value => sendCommand({ type: "gm:updateRoleCounts", payload: { roleCounts: resolveDraftValue("roleCounts", value) } }),
    [sendCommand, resolveDraftValue],
  );

  const setManualAssign: Dispatch<SetStateAction<ManualAssign>> = useCallback(
    value => sendCommand({ type: "gm:setManualAssign", payload: { manualAssign: resolveDraftValue("manualAssign", value) } }),
    [sendCommand, resolveDraftValue],
  );

  const setPlayers: Dispatch<SetStateAction<Player[]>> = useCallback(
    value => sendCommand({ type: "gm:setPlayers", payload: { players: resolveDraftValue("players", value) } }),
    [sendCommand, resolveDraftValue],
  );

  const dayVoteVictim = snapshot.dayVoteVictimId !== null
    ? players.find(player => player.id === snapshot.dayVoteVictimId) ?? null
    : null;

  if (snapshot.roomPhase === "lobby") {
    return (
      <OnlineLobby
        snapshot={snapshot}
        onStartSetup={() => sendCommand({ type: "gm:lockLobby" })}
        onTransferHost={playerId => sendCommand({ type: "gm:transferHost", payload: { playerId } })}
        onKickPlayer={playerId => sendCommand({ type: "gm:kickPlayer", payload: { playerId } })}
      />
    );
  }

  if (snapshot.roomPhase === "setup") {
    return (
      <SetupStep2
        players={players}
        roleCounts={snapshot.roleCounts}
        setRoleCounts={setRoleCounts}
        roleInfoId={roleInfoId}
        setRoleInfoId={setRoleInfoId}
        winMode={snapshot.winMode}
        setWinMode={winMode => sendCommand({ type: "gm:setPrefs", payload: { winMode } satisfies Partial<Prefs> })}
        revealMode={snapshot.revealMode}
        setRevealMode={revealMode => sendCommand({ type: "gm:setPrefs", payload: { revealMode } satisfies Partial<Prefs> })}
        roleReveal={false}
        setRoleReveal={() => undefined}
        hideRoleReveal
        onBack={() => sendCommand({ type: "gm:unlockLobby" })}
        onNext={() => sendCommand({ type: "gm:goToAssignment" })}
      />
    );
  }

  if (snapshot.roomPhase === "assignment") {
    return (
      <SetupStep3
        players={players}
        roleCounts={snapshot.roleCounts}
        assignMode={snapshot.assignMode}
        manualAssign={snapshot.manualAssign}
        setAssignMode={assignMode => sendCommand({ type: "gm:setAssignMode", payload: { assignMode } })}
        setManualAssign={setManualAssign}
        setPlayers={setPlayers}
        shuffleRoles={() => sendCommand({ type: "gm:shuffleRoles" })}
        startGame={() => sendCommand({ type: "gm:startGame" })}
        onBack={() => sendCommand({ type: "gm:lockLobby" })}
      />
    );
  }

  if (snapshot.roomPhase === "roleReveal") {
    return (
      <div className="h-full overflow-y-auto bg-gradient-to-b from-indigo-950 to-gray-950 text-white">
        <div className="min-h-full max-w-md mx-auto px-4 py-6 flex flex-col">
          <div className="text-center mb-6">
            <div className="text-6xl mb-3">🃏</div>
            <h1 className="text-2xl font-bold">Rollenaufdeckung</h1>
            <p className="text-gray-400 text-sm mt-2">Spieler sehen ihre Rolle auf dem eigenen Gerät.</p>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-4">
            <div className="space-y-2">
              {players.map(player => (
                <div key={player.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                  <span>{player.connected ? "🟢" : "⚫"} {player.name}</span>
                  <span className={player.roleRevealed ? "text-green-400 text-sm" : "text-gray-500 text-sm"}>
                    {player.roleRevealed ? "gesehen" : "wartet"}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <Btn
            onClick={() => sendCommand({ type: "gm:startFirstNight" })}
            cls="bg-purple-600 hover:bg-purple-500 text-white w-full mt-auto"
            size="lg"
          >
            Erste Nacht starten →
          </Btn>
        </div>
      </div>
    );
  }

  if (snapshot.roomPhase === "ended" && snapshot.winner) {
    return (
      <GameOver
        winner={snapshot.winner}
        round={snapshot.round}
        players={players}
        log={snapshot.log}
        onReset={() => sendCommand({ type: "gm:resetToLobby" })}
        resetLabel="Zurück zur Lobby mit Spielern"
      />
    );
  }

  const isNight = snapshot.gamePhase === "night";
  const bgClass = isNight
    ? "bg-gradient-to-b from-indigo-950 to-gray-950"
    : "bg-gradient-to-b from-amber-950/30 to-gray-950";

  return (
    <div className={`h-full flex flex-col ${bgClass} text-white`}>
      <div className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div>
            <span className="text-lg font-bold">{isNight ? "🌙" : "☀️"} Runde {snapshot.round}</span>
            <span className="text-gray-400 text-sm ml-2">{isNight ? "Nacht" : "Tag"} · {snapshot.roomCode}</span>
          </div>
          <div className="flex gap-2">
            <button aria-label="Spieler anzeigen" onClick={() => setShowPlayers(true)} className="px-3 py-1.5 bg-gray-800 rounded-lg text-sm">👥</button>
            <button aria-label="Spielprotokoll anzeigen" onClick={() => setShowLog(true)} className="px-3 py-1.5 bg-gray-800 rounded-lg text-sm">📜</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 max-w-md mx-auto w-full">
        {snapshot.triggerQueue[0]?.type === "hunter" && (
          <HunterTrigger
            currentTrigger={snapshot.triggerQueue[0]}
            players={players}
            resolveHunter={targetId => sendCommand({ type: "gm:resolveHunter", payload: { targetId } })}
          />
        )}
        {showPlayers && (
          <PlayerOverlay
            players={players}
            roleInfoId={roleInfoId}
            setRoleInfoId={setRoleInfoId}
            onClose={() => { setShowPlayers(false); setRoleInfoId(null); }}
          />
        )}
        {showLog && (
          <Modal onClose={() => setShowLog(false)}>
            <h2 className="text-lg font-bold mb-3">📜 Spielprotokoll</h2>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {snapshot.log.map((entry, index) => (
                <p key={index} className={`text-sm ${entry.text.startsWith("\n") ? "text-gray-400 font-semibold mt-2" : "text-gray-300"}`}>
                  {entry.text}
                </p>
              ))}
            </div>
            <button onClick={() => setShowLog(false)} className="font-semibold rounded-xl transition-all active:scale-95 px-4 py-3 text-base bg-gray-700 text-white w-full mt-4">Schließen</button>
          </Modal>
        )}

        {isNight && !snapshot.nightResolved && (
          <NightPhase
            nightSteps={nightSteps}
            nightStepIdx={snapshot.nightStepIdx}
            advanceNightStep={() => sendCommand({ type: "gm:advanceNightStep" })}
            resolveNight={() => sendCommand({ type: "gm:resolveNight" })}
            players={players}
            alive={alive}
            nightVictim={snapshot.nightVictim}
            setNightVictim={id => updateNightAction({ nightVictim: id })}
            nachtgastTarget={snapshot.nachtgastTarget}
            setNachtgastTarget={id => updateNightAction({ nachtgastTarget: id })}
            beschuetzerTarget={snapshot.beschuetzerTarget}
            beschuetzerLastTarget={snapshot.beschuetzerLastTarget}
            setBeschuetzerTarget={id => updateNightAction({ beschuetzerTarget: id })}
            verfluchterConvertedThisNight={snapshot.verfluchterConvertedThisNight}
            urwolfTransform={snapshot.urwolfTransform}
            setUrwolfTransform={value => updateNightAction({ urwolfTransform: value })}
            seerTarget={snapshot.seerTarget}
            setSeerTarget={id => updateNightAction({ seerTarget: id })}
            seerRevealed={snapshot.seerRevealed}
            setSeerRevealed={value => updateNightAction({ seerRevealed: value })}
            auraSeerTarget={snapshot.auraSeerTarget}
            setAuraSeerTarget={id => updateNightAction({ auraSeerTarget: id })}
            auraSeerRevealed={snapshot.auraSeerRevealed}
            setAuraSeerRevealed={value => updateNightAction({ auraSeerRevealed: value })}
            detectivePicks={snapshot.detectivePicks}
            setDetectivePicks={value => updateNightAction({ detectivePicks: resolveDraftValue("detectivePicks", value) })}
            detectiveRevealed={snapshot.detectiveRevealed}
            setDetectiveRevealed={value => updateNightAction({ detectiveRevealed: value })}
            witchHealUsed={snapshot.witchHealUsed}
            witchPoisonUsed={snapshot.witchPoisonUsed}
            witchHealThisRound={snapshot.witchHealThisRound}
            setWitchHealThisRound={value => updateNightAction({ witchHealThisRound: value })}
            witchPoisonTarget={snapshot.witchPoisonTarget}
            setWitchPoisonTarget={value => updateNightAction({ witchPoisonTarget: resolveDraftValue("witchPoisonTarget", value) })}
            amorPick={snapshot.amorPick}
            setAmorPick={value => updateNightAction({ amorPick: resolveDraftValue("amorPick", value) })}
            setPlayers={setPlayers}
            getEffectiveRole={getEffectiveRole}
            getEffectiveTeam={getEffectiveTeam}
            addLog={text => sendCommand({ type: "gm:addLog", payload: { text } })}
          />
        )}

        {isNight && snapshot.nightResolved && snapshot.triggerQueue.length === 0 && snapshot.roomPhase === "playing" && (
          <NightReport dayDeaths={snapshot.dayDeaths} startDay={() => sendCommand({ type: "gm:startDay" })} />
        )}

        {!isNight && (
          <DayPhase
            alive={alive}
            dayVoteDone={snapshot.dayVoteDone}
            voteConfirm={voteConfirm}
            setVoteConfirm={setVoteConfirm}
            triggerQueueLength={snapshot.triggerQueue.length}
            dayTimer={snapshot.dayTimer}
            timerRunning={snapshot.timerRunning}
            timerDuration={snapshot.timerDuration}
            setTimerRunning={timerRunning => sendCommand({ type: "gm:setTimer", payload: { timerRunning } })}
            setDayTimer={dayTimer => sendCommand({ type: "gm:setTimer", payload: { dayTimer } })}
            setTimerDuration={timerDuration => sendCommand({ type: "gm:setTimer", payload: { timerDuration } })}
            formatTime={formatTime}
            handleDayVote={playerId => sendCommand({ type: "gm:dayVote", payload: { playerId } })}
            startNight={() => sendCommand({ type: "gm:startNight" })}
            revealMode={snapshot.revealMode}
            dayVoteVictim={dayVoteVictim}
          />
        )}
      </div>

      <div className="sticky bottom-0 bg-gray-950/95 backdrop-blur border-t border-gray-800 px-4 py-3">
        <div className="flex justify-around max-w-md mx-auto text-center text-sm">
          <div><span className="text-green-400 font-bold text-lg">{alive.length}</span><br /><span className="text-gray-500">Am Leben</span></div>
          <div><span className="text-red-400 font-bold text-lg">{wolvesAlive.length}</span><br /><span className="text-gray-500">Wölfe</span></div>
          <div><span className="text-blue-400 font-bold text-lg">{villageAlive.length}</span><br /><span className="text-gray-500">Dorf</span></div>
          <div><span className="text-gray-400 font-bold text-lg">{players.length - alive.length}</span><br /><span className="text-gray-500">Tot</span></div>
        </div>
      </div>
    </div>
  );
}
