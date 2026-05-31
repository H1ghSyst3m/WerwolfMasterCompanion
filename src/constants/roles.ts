import type { Role, RoleId } from "../types";

export const ROLES: Record<RoleId, Role> = {
  werwolf: {
    name: "Werwolf",
    icon: "🐺",
    team: "wolf",
    cat: "classic",
    desc: "Du gehörst zu den Werwölfen. Wache nachts mit den anderen Wölfen auf, wählt gemeinsam ein Opfer und versucht, das Dorf zu überrennen.",
    rules: [
      {
        title: "Nachtaktion",
        text: "Alle lebenden Werwölfe wachen gemeinsam auf und wählen ein lebendes Opfer für den Angriff dieser Nacht.",
      },
      {
        title: "Sieg",
        text: "Die Werwölfe gewinnen, sobald mindestens so viele Wölfe wie Dorfbewohner leben. Im erweiterten Modus kann sich dieser Sieg durch Jäger oder Hexentränke verzögern.",
      },
      {
        title: "Sonderfälle",
        text: "Beschützer, Nachtgast, Hexe, Verfluchter, Harter Bursche und Urwolf können den Ausgang des Angriffs verändern.",
      },
    ],
  },
  dorfbewohner: {
    name: "Dorfbewohner",
    icon: "🏘️",
    team: "village",
    cat: "classic",
    desc: "Du hast keine Sonderfähigkeit. Beobachte gut, diskutiere tagsüber mit und hilf dem Dorf, die Werwölfe zu finden.",
    rules: [
      {
        title: "Aufgabe",
        text: "Dorfbewohner schlafen nachts und haben keine eigene Nachtaktion.",
      },
      {
        title: "Sieg",
        text: "Das Dorf gewinnt, wenn kein lebender Spieler mehr zum Team der Werwölfe gehört.",
      },
      {
        title: "Spielweise",
        text: "Deine Stärke liegt in Diskussion, Abstimmung und darin, Widersprüche bei anderen Spielern zu erkennen.",
      },
    ],
  },
  seher: {
    name: "Seher",
    icon: "👁️",
    team: "village",
    cat: "classic",
    unique: true,
    desc: "Du wachst jede Nacht auf und darfst eine Person prüfen. Die Spielleitung zeigt dir die genaue aktuelle Rolle dieser Person.",
    rules: [
      {
        title: "Nachtaktion",
        text: "Wähle jede Nacht einen lebenden Spieler. Du erfährst dessen genaue Rolle, nicht nur das Team.",
      },
      {
        title: "Wirksame Rolle",
        text: "Wenn eine Verwandlung in derselben Nacht bereits wirksam ist, zeigt die App die aktuelle wirksame Rolle an.",
      },
      {
        title: "Sieg",
        text: "Du spielst für das Dorf und gewinnst, wenn alle Werwölfe ausgeschaltet sind.",
      },
    ],
  },
  hexe: {
    name: "Hexe",
    icon: "🧪",
    team: "village",
    cat: "classic",
    unique: true,
    desc: "Du hast einen Heiltrank und einen Gifttrank. Jeder Trank kann im ganzen Spiel nur einmal benutzt werden.",
    rules: [
      {
        title: "Heiltrank",
        text: "Der Heiltrank kann einmal ein echtes Werwolf-Opfer retten. Gibt es durch Schutz, Verwandlung oder Sonderregeln nichts zu heilen, wird der Heiltrank nicht angeboten.",
      },
      {
        title: "Gifttrank",
        text: "Der Gifttrank kann einmal einen anderen lebenden Spieler töten. Er ist ein direkter Tod und wird nicht durch Beschützer-Schutz verhindert.",
      },
      {
        title: "Siegbedingung",
        text: "Im erweiterten Modus verzögert eine lebende Hexe mit mindestens einem übrigen Trank den sofortigen Sieg der Werwölfe.",
      },
    ],
  },
  jaeger: {
    name: "Jäger",
    icon: "🎯",
    team: "village",
    cat: "classic",
    unique: true,
    desc: "Wenn du stirbst, darfst du sofort noch einen lebenden Spieler erschießen oder bewusst verzichten.",
    rules: [
      {
        title: "Auslöser",
        text: "Der Schuss wird ausgelöst, egal ob der Jäger nachts, am Tag, durch Gift, Abstimmung, Liebeskummer oder eine andere Ursache stirbt.",
      },
      {
        title: "Letzter Schuss",
        text: "Der Jäger darf genau einen lebenden Spieler wählen oder passen. Der getroffene Spieler stirbt sofort.",
      },
      {
        title: "Ketteneffekte",
        text: "Wenn der Schuss weitere Todesfähigkeiten oder Liebenden-Tode auslöst, arbeitet die App diese Effekte nacheinander ab.",
      },
      {
        title: "Siegbedingung",
        text: "Im erweiterten Modus verzögert ein lebender Jäger den sofortigen Sieg der Werwölfe.",
      },
    ],
  },
  amor: {
    name: "Amor",
    icon: "💘",
    team: "village",
    cat: "classic",
    unique: true,
    desc: "Du wählst in der ersten Nacht zwei Liebende. Stirbt einer von ihnen, stirbt der andere aus Liebeskummer mit.",
    rules: [
      {
        title: "Erste Nacht",
        text: "Amor wacht nur in Nacht 1 auf und wählt zwei Spieler als Liebespaar. Amor darf auch selbst Teil des Paars sein.",
      },
      {
        title: "Liebestod",
        text: "Stirbt einer der Liebenden, stirbt der andere sofort mit. Das kann weitere Effekte wie Jägerschüsse auslösen.",
      },
      {
        title: "Liebenden-Sieg",
        text: "Wenn genau zwei Spieler leben und diese beiden ein Liebespaar sind, gewinnen sie gemeinsam unabhängig von ihren Teams.",
      },
    ],
  },
  narr: {
    name: "Narr",
    icon: "🃏",
    team: "village",
    cat: "special",
    unique: true,
    desc: "Du hast ein eigenes Ziel: Lass dich tagsüber hinrichten. Gelingt dir das, gewinnst du sofort allein.",
    rules: [
      {
        title: "Sonderziel",
        text: "Der Narr gehört in Teamprüfungen zum Dorf, gewinnt aber allein, wenn er durch die Tagesabstimmung hingerichtet wird.",
      },
      {
        title: "Nur am Tag",
        text: "Stirbt der Narr nachts oder durch andere Effekte, löst das keinen Narr-Sieg aus.",
      },
      {
        title: "Spielende",
        text: "Bei einer erfolgreichen Hinrichtung endet das Spiel sofort mit dem Narr als Gewinner.",
      },
    ],
  },
  dorftrottel: {
    name: "Dorftrottel",
    icon: "🤡",
    team: "village",
    cat: "special",
    unique: true,
    desc: "Du willst in der ersten Tagesabstimmung hingerichtet werden. Überlebst du Runde 1, wirst du zum normalen Dorfbewohner.",
    rules: [
      {
        title: "Sonderziel",
        text: "Der Dorftrottel gewinnt nur, wenn er in Runde 1 durch die Tagesabstimmung hingerichtet wird.",
      },
      {
        title: "Nach Runde 1",
        text: "Überlebt der Dorftrottel die erste Tagesabstimmung, ändert die App seine Rolle zu Dorfbewohner.",
      },
      {
        title: "Späterer Tod",
        text: "Nach der Umwandlung gilt der Dorftrottel wie ein normaler Dorfbewohner und löst keinen Sondersieg mehr aus.",
      },
    ],
  },
  auraseher: {
    name: "Aura-Seher",
    icon: "🔮",
    team: "village",
    cat: "special",
    unique: true,
    desc: "Du prüfst jede Nacht eine Person und erfährst nur, ob sie gut oder böse ist, nicht ihre genaue Rolle.",
    rules: [
      {
        title: "Nachtaktion",
        text: "Wähle jede Nacht einen lebenden Spieler. Die Spielleitung zeigt dir nur das Team: gut oder böse.",
      },
      {
        title: "Wirksames Team",
        text: "Verwandlungen, die bereits wirksam sind, werden berücksichtigt. Ein frisch verwandelter Spieler kann also als böse erscheinen.",
      },
      {
        title: "Grenze",
        text: "Du erfährst keine genaue Rolle und keine Sonderziele, sondern ausschließlich die Teamseite.",
      },
    ],
  },
  detektiv: {
    name: "Detektiv",
    icon: "🔍",
    team: "village",
    cat: "special",
    unique: true,
    desc: "Du wählst jede Nacht zwei Personen und erfährst, ob sie zum gleichen Team gehören oder nicht.",
    rules: [
      {
        title: "Nachtaktion",
        text: "Wähle zwei lebende Spieler. Die Spielleitung sagt dir, ob beide auf derselben Teamseite stehen.",
      },
      {
        title: "Wirksames Team",
        text: "Die App verwendet das aktuell wirksame Team, inklusive bereits wirksamer Verwandlungen.",
      },
      {
        title: "Grenze",
        text: "Du erfährst keine genaue Rolle und nicht, welches der beiden Teams sie haben, nur gleich oder verschieden.",
      },
    ],
  },
  urwolf: {
    name: "Urwolf",
    icon: "🐺",
    team: "wolf",
    cat: "special",
    unique: true,
    desc: "Du bist ein Werwolf mit einer einmaligen Macht. Du kannst ein Werwolf-Opfer verwandeln, statt es sterben zu lassen.",
    rules: [
      {
        title: "Einmalige Fähigkeit",
        text: "Nach dem Werwolf-Angriff darf der Urwolf einmal im Spiel entscheiden, das Opfer in einen Werwolf zu verwandeln.",
      },
      {
        title: "Verwandlung",
        text: "Das Opfer überlebt, wechselt heimlich auf die Werwolf-Seite und sieht privat seine neue Rolle als Werwolf.",
      },
      {
        title: "Blockaden",
        text: "Ist der Angriff durch Beschützer verhindert, trifft das Ziel wegen Nachtgast nicht zu Hause oder ist der Verfluchter bereits verwandelt, wird die Fähigkeit nicht verbraucht.",
      },
      {
        title: "Information",
        text: "Seher- und Teamprüfungen sehen eine bereits feststehende Verwandlung in derselben Nacht als Werwolf.",
      },
    ],
  },
  nachtgast: {
    name: "Nachtgast",
    icon: "🛏️",
    team: "village",
    cat: "special",
    unique: true,
    desc: "Du schläfst jede Nacht bei einer anderen Person. Zuhause bist du für die Werwölfe nicht zu finden, beim Gastgeber kannst du mitgetroffen werden.",
    rules: [
      {
        title: "Nachtaktion",
        text: "Der Nachtgast wacht vor den Werwölfen auf und besucht einen anderen lebenden Spieler.",
      },
      {
        title: "Direkter Angriff",
        text: "Greifen die Werwölfe den Nachtgast direkt an, während er unterwegs ist, finden sie ihn nicht zu Hause.",
      },
      {
        title: "Gastgeber wird angegriffen",
        text: "Greifen die Werwölfe den besuchten Gastgeber an, ist der Gastgeber das Hauptopfer und der Nachtgast wird zusätzlich getroffen.",
      },
      {
        title: "Grenze",
        text: "Der Nachtgast verändert nur Werwolf-Angriffe. Abstimmung, Gift, Jägerschuss und Liebestod funktionieren normal.",
      },
    ],
  },
  beschuetzer: {
    name: "Beschützer",
    icon: "🛡️",
    team: "village",
    cat: "special",
    unique: true,
    desc: "Du schützt jede Nacht eine andere lebende Person vor dem Werwolf-Angriff. Dich selbst und dieselbe Person zweimal hintereinander kannst du nicht schützen.",
    rules: [
      {
        title: "Nachtaktion",
        text: "Der Beschützer wacht vor den Werwölfen auf und wählt einen lebenden Spieler als Schutz für diese Nacht.",
      },
      {
        title: "Einschränkungen",
        text: "Der Beschützer darf sich nicht selbst schützen und nicht dieselbe Person in zwei Nächten direkt hintereinander wählen.",
      },
      {
        title: "Wirkung",
        text: "Trifft der Werwolf-Angriff das geschützte Ziel, wird der Angriff verhindert. Dadurch entstehen auch keine Nachtgast-Folgetreffer.",
      },
      {
        title: "Grenze",
        text: "Der Schutz gilt nur gegen Werwolf-Angriffe. Gift, Abstimmung, Jägerschuss und Liebestod können die geschützte Person trotzdem töten.",
      },
    ],
  },
  wildeskind: {
    name: "Wildes Kind",
    icon: "🌿",
    team: "village",
    cat: "special",
    unique: true,
    desc: "Du wählst in der ersten Nacht ein Vorbild. Solange es lebt, spielst du für das Dorf; stirbt es, wirst du heimlich zum Werwolf.",
    rules: [
      {
        title: "Erste Nacht",
        text: "Das Wilde Kind wählt in Nacht 1 einen anderen lebenden Spieler als Vorbild.",
      },
      {
        title: "Verwandlung",
        text: "Sobald der Tod des Vorbilds an einem Auflösungspunkt bekannt ist, wird das lebende Wilde Kind heimlich zum Werwolf.",
      },
      {
        title: "Geheimhaltung",
        text: "Die Gruppe wird nicht öffentlich informiert. Die private Rollenkarte zeigt dem Spieler danach die neue Rolle als Werwolf.",
      },
      {
        title: "Zeitpunkt",
        text: "Die Verwandlung passiert nach vollständigen Nacht-, Tages- oder Folge-Tod-Auflösungen, nicht mitten in einer einzelnen Auswahl.",
      },
    ],
  },
  verfluchter: {
    name: "Verfluchter",
    icon: "⛓️",
    team: "village",
    cat: "special",
    unique: true,
    desc: "Du startest im Dorf. Greifen dich die Werwölfe direkt an, stirbst du nicht, sondern wirst heimlich selbst zum Werwolf.",
    rules: [
      {
        title: "Verfluchung",
        text: "Wird der Verfluchte direkt von den Werwölfen angegriffen, überlebt er und wechselt heimlich auf die Werwolf-Seite.",
      },
      {
        title: "Information",
        text: "Die Spielleitung informiert den betroffenen Spieler heimlich. Die private Rollenkarte zeigt danach Werwolf als aktuelle Rolle.",
      },
      {
        title: "Blockaden",
        text: "Schützt der Beschützer den Verfluchten, wird der Angriff verhindert und es passiert keine Verwandlung.",
      },
      {
        title: "Andere Todesarten",
        text: "Abstimmung, Gift, Jägerschuss, Liebestod und andere Nicht-Werwolf-Tode töten den Verfluchten normal.",
      },
    ],
  },
  harterbursche: {
    name: "Harter Bursche",
    icon: "💪",
    team: "village",
    cat: "special",
    unique: true,
    desc: "Du hältst einen Werwolf-Angriff zunächst aus. Wirst du nachts verwundet, spielst du den nächsten Tag noch mit und stirbst am folgenden Morgen.",
    rules: [
      {
        title: "Werwolf-Angriff",
        text: "Wird der Harte Bursche von den Werwölfen getroffen und nicht gerettet oder geschützt, stirbt er nicht sofort, sondern wird verwundet.",
      },
      {
        title: "Verwundung",
        text: "Die Spielleitung informiert ihn heimlich. Er bleibt lebendig, kann mitdiskutieren und ist weiter auswählbar.",
      },
      {
        title: "Folgetod",
        text: "Am nächsten Tagesanbruch stirbt er an der alten Wunde. Eine spätere Heilung verhindert diesen alten Wundtod nicht.",
      },
      {
        title: "Andere Todesarten",
        text: "Abstimmung, Gift, Jägerschuss, Liebestod und andere direkte Effekte töten den Harten Burschen normal.",
      },
    ],
  },
};

export const ROLE_IDS = Object.keys(ROLES) as RoleId[];

export const ROLE_ID_SET = new Set<RoleId>(ROLE_IDS);
