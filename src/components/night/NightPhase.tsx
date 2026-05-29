import { Btn } from "../ui/Btn";
import { NightStepSleep } from "./NightStepSleep";
import { NightStepWolves } from "./NightStepWolves";
import { NightStepVerfluchter } from "./NightStepVerfluchter";
import { NightStepUrwolf } from "./NightStepUrwolf";
import { NightStepUrwolfInfo } from "./NightStepUrwolfInfo";
import { NightStepAmor } from "./NightStepAmor";
import { NightStepLovers } from "./NightStepLovers";
import { NightStepNachtgast } from "./NightStepNachtgast";
import { NightStepBeschuetzer } from "./NightStepBeschuetzer";
import { NightStepSeer } from "./NightStepSeer";
import { NightStepAuraSeer } from "./NightStepAuraSeer";
import { NightStepDetective } from "./NightStepDetective";
import { NightStepWitch } from "./NightStepWitch";
import { NightStepHarterBursche } from "./NightStepHarterBursche";
import { NightStepDawn } from "./NightStepDawn";
import { isNachtgastAwayFromWolfAttack } from "../../logic/gameLogic";
import type { Dispatch, SetStateAction } from "react";
import type { Player, NightStep, NightStepId, RoleId } from "../../types";

interface NightPhaseProps {
  // Step management
  nightSteps: NightStep[];
  nightStepIdx: number;
  advanceNightStep: (urwolfTransformOverride?: boolean | null) => void;
  resolveNight: () => void;
  // Players
  players: Player[];
  alive: Player[];
  // Night actions
  nightVictim: number | null;
  setNightVictim: (id: number) => void;
  nachtgastTarget: number | null;
  setNachtgastTarget: (id: number) => void;
  beschuetzerTarget: number | null;
  beschuetzerLastTarget: number | null;
  setBeschuetzerTarget: (id: number) => void;
  verfluchterConvertedThisNight: number | null;
  harterBurscheWoundedThisNight: number | null;
  urwolfTransformTarget: number | null;
  urwolfTransform: boolean | null;
  setUrwolfTransform: (v: boolean) => void;
  seerTarget: number | null;
  setSeerTarget: (id: number) => void;
  seerRevealed: boolean;
  setSeerRevealed: (v: boolean) => void;
  auraSeerTarget: number | null;
  setAuraSeerTarget: (id: number) => void;
  auraSeerRevealed: boolean;
  setAuraSeerRevealed: (v: boolean) => void;
  detectivePicks: number[];
  setDetectivePicks: Dispatch<SetStateAction<number[]>>;
  detectiveRevealed: boolean;
  setDetectiveRevealed: (v: boolean) => void;
  witchHealUsed: boolean;
  witchPoisonUsed: boolean;
  witchHealThisRound: boolean;
  setWitchHealThisRound: (v: boolean) => void;
  witchPoisonTarget: number | null;
  setWitchPoisonTarget: Dispatch<SetStateAction<number | null>>;
  amorPick: number[];
  setAmorPick: Dispatch<SetStateAction<number[]>>;
  setPlayers: Dispatch<SetStateAction<Player[]>>;
  // Derived helpers
  getEffectiveRole: (playerId: number) => RoleId | null | undefined;
  getEffectiveTeam: (playerId: number) => "wolf" | "village";
  addLog: (text: string) => void;
}

export function NightPhase({
  nightSteps,
  nightStepIdx,
  advanceNightStep,
  resolveNight,
  players,
  alive,
  nightVictim,
  setNightVictim,
  nachtgastTarget,
  setNachtgastTarget,
  beschuetzerTarget,
  beschuetzerLastTarget,
  setBeschuetzerTarget,
  verfluchterConvertedThisNight,
  harterBurscheWoundedThisNight,
  urwolfTransformTarget,
  urwolfTransform,
  setUrwolfTransform,
  seerTarget,
  setSeerTarget,
  seerRevealed,
  setSeerRevealed,
  auraSeerTarget,
  setAuraSeerTarget,
  auraSeerRevealed,
  setAuraSeerRevealed,
  detectivePicks,
  setDetectivePicks,
  detectiveRevealed,
  setDetectiveRevealed,
  witchHealUsed,
  witchPoisonUsed,
  witchHealThisRound,
  setWitchHealThisRound,
  witchPoisonTarget,
  setWitchPoisonTarget,
  amorPick,
  setAmorPick,
  setPlayers,
  getEffectiveRole,
  getEffectiveTeam,
  addLog,
}: NightPhaseProps) {
  const currentNightStep = nightSteps[nightStepIdx];
  if (!currentNightStep) return null;

  /** Returns the players who are "awake" for the given step (for display) */
  const getNightStepPlayers = (stepId: NightStepId): Player[] | null => {
    const roleMap: Partial<Record<NightStepId, RoleId[]>> = {
      amor: ["amor"],
      nachtgast: ["nachtgast"],
      beschuetzer: ["beschuetzer"],
      urwolf: ["urwolf"],
      seer: ["seher"],
      auraseer: ["auraseher"],
      detective: ["detektiv"],
      witch: ["hexe"],
    };
    if (stepId === "wolves") {
      const matching = players.filter(p => getEffectiveTeam(p.id) === "wolf");
      return matching.length === 0 ? null : matching;
    }
    if (stepId === "verfluchter") {
      const matching = players.filter(p => p.id === verfluchterConvertedThisNight);
      return matching.length === 0 ? null : matching;
    }
    if (stepId === "harterbursche") {
      const matching = players.filter(p => p.id === harterBurscheWoundedThisNight);
      return matching.length === 0 ? null : matching;
    }
    if (stepId === "urwolfinfo") {
      const matching = players.filter(p => p.id === urwolfTransformTarget);
      return matching.length === 0 ? null : matching;
    }
    const roles = roleMap[stepId];
    if (!roles) return null;
    const matching = players.filter(p => {
      const effectiveRole = getEffectiveRole(p.id);
      return effectiveRole != null && roles.includes(effectiveRole);
    });
    return matching.length === 0 ? null : matching;
  };

  const stepPlayers = getNightStepPlayers(currentNightStep.id);
  const wolfAttackProtected =
    nightVictim !== null &&
    nightVictim === beschuetzerTarget &&
    nightVictim !== verfluchterConvertedThisNight;
  const canHealWolfVictim =
    !wolfAttackProtected &&
    !isNachtgastAwayFromWolfAttack(players, nightVictim, nachtgastTarget) &&
    nightVictim !== verfluchterConvertedThisNight;
  const canPoisonWolfVictim =
    nightVictim !== null && (nightVictim === verfluchterConvertedThisNight || wolfAttackProtected);

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex gap-1 mb-2">
        {nightSteps.map((s, i) => (
          <div
            key={s.id}
            className={`flex-1 h-1.5 rounded-full ${i <= nightStepIdx ? "bg-purple-500" : "bg-gray-700"}`}
          />
        ))}
      </div>

      {/* Step header card */}
      <div className="bg-gray-900/80 rounded-2xl p-6 border border-gray-800 text-center">
        <div className="text-5xl mb-3">{currentNightStep.icon}</div>
        <h2 className="text-2xl font-bold mb-2">{currentNightStep.title}</h2>
        <p className="text-gray-400">{currentNightStep.desc}</p>
        {stepPlayers && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {stepPlayers.map(p => (
              <span
                key={p.id}
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  p.alive
                    ? "bg-purple-900/50 border border-purple-600 text-purple-300"
                    : "bg-gray-800 border border-gray-700 text-gray-500 line-through"
                }`}
              >
                {p.alive ? "🟢" : "💀"} {p.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Inactive step placeholder (keep rhythm) */}
      {!currentNightStep.active &&
        currentNightStep.id !== "sleep" &&
        currentNightStep.id !== "dawn" && (
          <div className="space-y-3">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-center">
              <p className="text-gray-500 text-sm">💤 Keine Aktion. Rolle ist nicht mehr aktiv.</p>
              <p className="text-gray-600 text-xs mt-1">Kurz warten, dann weiter, um den Ablauf einzuhalten.</p>
            </div>
            <Btn onClick={() => advanceNightStep()} cls="bg-indigo-600 hover:bg-indigo-500 text-white w-full" size="lg">
              Weiter →
            </Btn>
          </div>
        )}

      {/* Step-specific UI */}
      {currentNightStep.id === "sleep" && (
        <NightStepSleep advanceNightStep={advanceNightStep} />
      )}

      {currentNightStep.active && currentNightStep.id === "amor" && (
        <NightStepAmor
          alive={alive}
          players={players}
          amorPick={amorPick}
          setAmorPick={setAmorPick}
          setPlayers={setPlayers}
          addLog={addLog}
          advanceNightStep={advanceNightStep}
        />
      )}

      {currentNightStep.active && currentNightStep.id === "lovers" && (
        <NightStepLovers
          players={players}
          amorPick={amorPick}
          addLog={addLog}
          advanceNightStep={advanceNightStep}
        />
      )}

      {currentNightStep.active && currentNightStep.id === "nachtgast" && (
        <NightStepNachtgast
          alive={alive}
          nachtgastTarget={nachtgastTarget}
          setNachtgastTarget={setNachtgastTarget}
          addLog={addLog}
          advanceNightStep={advanceNightStep}
        />
      )}

      {currentNightStep.active && currentNightStep.id === "beschuetzer" && (
        <NightStepBeschuetzer
          alive={alive}
          beschuetzerTarget={beschuetzerTarget}
          beschuetzerLastTarget={beschuetzerLastTarget}
          setBeschuetzerTarget={setBeschuetzerTarget}
          addLog={addLog}
          advanceNightStep={advanceNightStep}
        />
      )}

      {currentNightStep.active && currentNightStep.id === "wolves" && (
        <NightStepWolves
          alive={alive}
          nightVictim={nightVictim}
          setNightVictim={setNightVictim}
          advanceNightStep={advanceNightStep}
          getEffectiveTeam={getEffectiveTeam}
        />
      )}

      {currentNightStep.active && currentNightStep.id === "verfluchter" && (
        <NightStepVerfluchter
          players={players}
          convertedPlayerId={verfluchterConvertedThisNight}
          advanceNightStep={advanceNightStep}
        />
      )}

      {currentNightStep.active && currentNightStep.id === "urwolf" && (
        <NightStepUrwolf
          nightVictim={nightVictim}
          beschuetzerTarget={beschuetzerTarget}
          verfluchterConvertedThisNight={verfluchterConvertedThisNight}
          players={players}
          setUrwolfTransform={setUrwolfTransform}
          advanceNightStep={advanceNightStep}
        />
      )}

      {currentNightStep.active && currentNightStep.id === "urwolfinfo" && (
        <NightStepUrwolfInfo
          players={players}
          transformedPlayerId={urwolfTransformTarget}
          advanceNightStep={advanceNightStep}
        />
      )}

      {currentNightStep.active && currentNightStep.id === "seer" && (
        <NightStepSeer
          alive={alive}
          players={players}
          seerTarget={seerTarget}
          setSeerTarget={setSeerTarget}
          seerRevealed={seerRevealed}
          setSeerRevealed={setSeerRevealed}
          getEffectiveRole={getEffectiveRole}
          addLog={addLog}
          advanceNightStep={advanceNightStep}
        />
      )}

      {currentNightStep.active && currentNightStep.id === "auraseer" && (
        <NightStepAuraSeer
          alive={alive}
          players={players}
          auraSeerTarget={auraSeerTarget}
          setAuraSeerTarget={setAuraSeerTarget}
          auraSeerRevealed={auraSeerRevealed}
          setAuraSeerRevealed={setAuraSeerRevealed}
          getEffectiveTeam={getEffectiveTeam}
          addLog={addLog}
          advanceNightStep={advanceNightStep}
        />
      )}

      {currentNightStep.active && currentNightStep.id === "detective" && (
        <NightStepDetective
          alive={alive}
          players={players}
          detectivePicks={detectivePicks}
          setDetectivePicks={setDetectivePicks}
          detectiveRevealed={detectiveRevealed}
          setDetectiveRevealed={setDetectiveRevealed}
          getEffectiveTeam={getEffectiveTeam}
          addLog={addLog}
          advanceNightStep={advanceNightStep}
        />
      )}

      {currentNightStep.active && currentNightStep.id === "witch" && (
        <NightStepWitch
          alive={alive}
          players={players}
          nightVictim={nightVictim}
          canHealWolfVictim={canHealWolfVictim}
          canPoisonWolfVictim={canPoisonWolfVictim}
          urwolfTransform={urwolfTransform}
          witchHealUsed={witchHealUsed}
          witchPoisonUsed={witchPoisonUsed}
          witchHealThisRound={witchHealThisRound}
          setWitchHealThisRound={setWitchHealThisRound}
          witchPoisonTarget={witchPoisonTarget}
          setWitchPoisonTarget={setWitchPoisonTarget}
          advanceNightStep={advanceNightStep}
        />
      )}

      {currentNightStep.active && currentNightStep.id === "harterbursche" && (
        <NightStepHarterBursche
          players={players}
          woundedPlayerId={harterBurscheWoundedThisNight}
          advanceNightStep={advanceNightStep}
        />
      )}

      {currentNightStep.id === "dawn" && (
        <NightStepDawn resolveNight={resolveNight} />
      )}
    </div>
  );
}
