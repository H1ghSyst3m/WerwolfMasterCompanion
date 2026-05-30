import type { NightStep, RoleId } from "../types";

export interface BuildNightStepsParams {
  round: number;
  urwolfUsed: boolean;
  witchHealUsed: boolean;
  witchPoisonUsed: boolean;
  verfluchterConvertedThisNight: number | null;
  urwolfTransformTarget?: number | null;
  harterBurscheWoundedThisNight?: number | null;
  hadRole: (r: RoleId) => boolean;
  aliveWithRole: (r: RoleId) => boolean;
  amorPick: number[];
}

export function buildNightSteps({
  round,
  urwolfUsed,
  witchHealUsed,
  witchPoisonUsed,
  verfluchterConvertedThisNight,
  urwolfTransformTarget = null,
  harterBurscheWoundedThisNight = null,
  hadRole,
  aliveWithRole,
  amorPick,
}: BuildNightStepsParams): NightStep[] {
  const steps: NightStep[] = [
    { id: "sleep", title: "Alle schlafen ein", icon: "😴", desc: "Bitte alle Spieler die Augen schließen.", active: true },
  ];

  if (hadRole("amor") && round === 1) {
    steps.push({
      id: "amor",
      title: "Amor erwacht",
      icon: "💘",
      desc: "Amor wählt zwei Spieler als Liebespaar.",
      active: aliveWithRole("amor"),
    });
    steps.push({
      id: "lovers",
      title: "Liebespaar erwacht",
      icon: "💕",
      desc: "Die beiden Liebenden öffnen die Augen und sehen sich an.",
      active: amorPick.length === 2,
    });
  }

  if (hadRole("wildeskind") && round === 1) {
    steps.push({
      id: "wildeskind",
      title: "Wildes Kind erwacht",
      icon: "🌿",
      desc: "Wildes Kind wählt ein lebendes Vorbild.",
      active: aliveWithRole("wildeskind"),
    });
  }

  if (hadRole("nachtgast")) {
    steps.push({
      id: "nachtgast",
      title: "Nachtgast erwacht",
      icon: "🛏️",
      desc: "Nachtgast wählt, bei wem er diese Nacht übernachtet.",
      active: aliveWithRole("nachtgast"),
    });
  }

  if (hadRole("beschuetzer")) {
    steps.push({
      id: "beschuetzer",
      title: "Beschützer erwacht",
      icon: "🛡️",
      desc: "Beschützer wählt einen Spieler, der vor dem Werwolf-Angriff geschützt wird.",
      active: aliveWithRole("beschuetzer"),
    });
  }

  steps.push({
    id: "wolves",
    title: "Werwölfe erwachen",
    icon: "🐺",
    desc: "Werwölfe einigen sich auf ein Opfer.",
    active: true,
  });

  if (verfluchterConvertedThisNight !== null) {
    steps.push({
      id: "verfluchter",
      title: "Verfluchten informieren",
      icon: "⛓️",
      desc: "Informiere den verwandelten Verfluchten leise.",
      active: true,
    });
  }

  if (hadRole("urwolf")) {
    steps.push({
      id: "urwolf",
      title: "Urwolf erwacht",
      icon: "🐺",
      desc: "Urwolf entscheidet: Soll das Opfer verwandelt statt getötet werden? (einmalig)",
      active: aliveWithRole("urwolf") && !urwolfUsed,
    });
    if (urwolfTransformTarget !== null) {
      steps.push({
        id: "urwolfinfo",
        title: "Verwandelten informieren",
        icon: "🐺",
        desc: "Informiere den vom Urwolf verwandelten Spieler leise.",
        active: true,
      });
    }
  }

  if (hadRole("seher")) {
    steps.push({
      id: "seer",
      title: "Seher erwacht",
      icon: "👁️",
      desc: "Seher wählt einen Spieler und erfährt dessen genaue Rolle.",
      active: aliveWithRole("seher"),
    });
  }

  if (hadRole("auraseher")) {
    steps.push({
      id: "auraseer",
      title: "Aura-Seher erwacht",
      icon: "🔮",
      desc: "Aura-Seher wählt einen Spieler und erfährt ob er gut oder böse ist.",
      active: aliveWithRole("auraseher"),
    });
  }

  if (hadRole("detektiv")) {
    steps.push({
      id: "detective",
      title: "Detektiv erwacht",
      icon: "🔍",
      desc: "Detektiv wählt zwei Spieler und erfährt ob sie im gleichen Team sind.",
      active: aliveWithRole("detektiv"),
    });
  }

  if (hadRole("hexe")) {
    steps.push({
      id: "witch",
      title: "Hexe erwacht",
      icon: "🧪",
      desc: "Hexe entscheidet über Heil- und Gifttrank.",
      active: aliveWithRole("hexe") && (!witchHealUsed || !witchPoisonUsed),
    });
  }

  if (harterBurscheWoundedThisNight !== null) {
    steps.push({
      id: "harterbursche",
      title: "Harten Burschen informieren",
      icon: "💪",
      desc: "Informiere den Harten Burschen leise: Er wurde getroffen, spielt den nächsten Tag noch mit und stirbt beim darauffolgenden Tagesanbruch.",
      active: true,
    });
  }

  steps.push({
    id: "dawn",
    title: "Die Sonne geht auf",
    icon: "🌅",
    desc: "Nacht ist vorbei. Auswertung...",
    active: true,
  });

  return steps;
}
