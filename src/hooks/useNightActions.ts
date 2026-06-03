import { useState, useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";

export interface NightActionsHook {
  nightStepIdx: number;
  setNightStepIdx: Dispatch<SetStateAction<number>>;
  nightVictim: number | null;
  setNightVictim: Dispatch<SetStateAction<number | null>>;
  nachtgastTarget: number | null;
  setNachtgastTarget: Dispatch<SetStateAction<number | null>>;
  beschuetzerTarget: number | null;
  setBeschuetzerTarget: Dispatch<SetStateAction<number | null>>;
  beschuetzerLastTarget: number | null;
  setBeschuetzerLastTarget: Dispatch<SetStateAction<number | null>>;
  wildesKindVorbild: number | null;
  setWildesKindVorbild: Dispatch<SetStateAction<number | null>>;
  verfluchterConvertedThisNight: number | null;
  setVerfluchterConvertedThisNight: Dispatch<SetStateAction<number | null>>;
  wolvesSkipNextNight: boolean;
  setWolvesSkipNextNight: Dispatch<SetStateAction<boolean>>;
  harterBurscheWounded: number | null;
  setHarterBurscheWounded: Dispatch<SetStateAction<number | null>>;
  harterBurscheWoundedThisNight: number | null;
  setHarterBurscheWoundedThisNight: Dispatch<SetStateAction<number | null>>;
  urwolfTransform: boolean | null;
  setUrwolfTransform: Dispatch<SetStateAction<boolean | null>>;
  urwolfUsed: boolean;
  setUrwolfUsed: Dispatch<SetStateAction<boolean>>;
  seerTarget: number | null;
  setSeerTarget: Dispatch<SetStateAction<number | null>>;
  seerRevealed: boolean;
  setSeerRevealed: Dispatch<SetStateAction<boolean>>;
  auraSeerTarget: number | null;
  setAuraSeerTarget: Dispatch<SetStateAction<number | null>>;
  auraSeerRevealed: boolean;
  setAuraSeerRevealed: Dispatch<SetStateAction<boolean>>;
  detectivePicks: number[];
  setDetectivePicks: Dispatch<SetStateAction<number[]>>;
  detectiveRevealed: boolean;
  setDetectiveRevealed: Dispatch<SetStateAction<boolean>>;
  witchHealUsed: boolean;
  setWitchHealUsed: Dispatch<SetStateAction<boolean>>;
  witchPoisonUsed: boolean;
  setWitchPoisonUsed: Dispatch<SetStateAction<boolean>>;
  witchHealThisRound: boolean;
  setWitchHealThisRound: Dispatch<SetStateAction<boolean>>;
  witchPoisonTarget: number | null;
  setWitchPoisonTarget: Dispatch<SetStateAction<number | null>>;
  amorPick: number[];
  setAmorPick: Dispatch<SetStateAction<number[]>>;
  nightResolved: boolean;
  setNightResolved: Dispatch<SetStateAction<boolean>>;
  resetNightActions: () => void;
}

export function useNightActions(): NightActionsHook {
  const [nightStepIdx, setNightStepIdx] = useState(0);
  const [nightVictim, setNightVictim] = useState<number | null>(null);
  const [nachtgastTarget, setNachtgastTarget] = useState<number | null>(null);
  const [beschuetzerTarget, setBeschuetzerTarget] = useState<number | null>(null);
  const [beschuetzerLastTarget, setBeschuetzerLastTarget] = useState<number | null>(null);
  const [wildesKindVorbild, setWildesKindVorbild] = useState<number | null>(null);
  const [verfluchterConvertedThisNight, setVerfluchterConvertedThisNight] = useState<number | null>(null);
  const [wolvesSkipNextNight, setWolvesSkipNextNight] = useState(false);
  const [harterBurscheWounded, setHarterBurscheWounded] = useState<number | null>(null);
  const [harterBurscheWoundedThisNight, setHarterBurscheWoundedThisNight] = useState<number | null>(null);
  const [urwolfTransform, setUrwolfTransform] = useState<boolean | null>(null);
  const [urwolfUsed, setUrwolfUsed] = useState(false);
  const [seerTarget, setSeerTarget] = useState<number | null>(null);
  const [seerRevealed, setSeerRevealed] = useState(false);
  const [auraSeerTarget, setAuraSeerTarget] = useState<number | null>(null);
  const [auraSeerRevealed, setAuraSeerRevealed] = useState(false);
  const [detectivePicks, setDetectivePicks] = useState<number[]>([]);
  const [detectiveRevealed, setDetectiveRevealed] = useState(false);
  const [witchHealUsed, setWitchHealUsed] = useState(false);
  const [witchPoisonUsed, setWitchPoisonUsed] = useState(false);
  const [witchHealThisRound, setWitchHealThisRound] = useState(false);
  const [witchPoisonTarget, setWitchPoisonTarget] = useState<number | null>(null);
  const [amorPick, setAmorPick] = useState<number[]>([]);
  const [nightResolved, setNightResolved] = useState(false);

  const resetNightActions = useCallback(() => {
    setNightStepIdx(0);
    setNightVictim(null);
    setNachtgastTarget(null);
    setBeschuetzerTarget(null);
    setVerfluchterConvertedThisNight(null);
    setHarterBurscheWoundedThisNight(null);
    setUrwolfTransform(null);
    setSeerTarget(null);
    setSeerRevealed(false);
    setAuraSeerTarget(null);
    setAuraSeerRevealed(false);
    setDetectivePicks([]);
    setDetectiveRevealed(false);
    setWitchHealThisRound(false);
    setWitchPoisonTarget(null);
    setNightResolved(false);
  }, []);

  return {
    nightStepIdx, setNightStepIdx,
    nightVictim, setNightVictim,
    nachtgastTarget, setNachtgastTarget,
    beschuetzerTarget, setBeschuetzerTarget,
    beschuetzerLastTarget, setBeschuetzerLastTarget,
    wildesKindVorbild, setWildesKindVorbild,
    verfluchterConvertedThisNight, setVerfluchterConvertedThisNight,
    wolvesSkipNextNight, setWolvesSkipNextNight,
    harterBurscheWounded, setHarterBurscheWounded,
    harterBurscheWoundedThisNight, setHarterBurscheWoundedThisNight,
    urwolfTransform, setUrwolfTransform,
    urwolfUsed, setUrwolfUsed,
    seerTarget, setSeerTarget,
    seerRevealed, setSeerRevealed,
    auraSeerTarget, setAuraSeerTarget,
    auraSeerRevealed, setAuraSeerRevealed,
    detectivePicks, setDetectivePicks,
    detectiveRevealed, setDetectiveRevealed,
    witchHealUsed, setWitchHealUsed,
    witchPoisonUsed, setWitchPoisonUsed,
    witchHealThisRound, setWitchHealThisRound,
    witchPoisonTarget, setWitchPoisonTarget,
    amorPick, setAmorPick,
    nightResolved, setNightResolved,
    resetNightActions,
  };
}
