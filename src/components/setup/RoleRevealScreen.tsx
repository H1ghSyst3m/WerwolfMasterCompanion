import { useState, useRef, useCallback } from "react";
import { getRoleDisplay } from "../../domain/roleDisplay";
import { Btn } from "../ui/Btn";
import { RoleInfoModal } from "../ui/RoleInfoModal";
import type { Player, RoleId } from "../../types";

interface RoleRevealScreenProps {
  players: Player[];
  onDone: () => void;
  title?: string;
  instructionText?: string;
  doneLabel?: string;
  showRoleInfo?: boolean;
  showRoleInfoIdentity?: boolean;
}

const DRAG_THRESHOLD = 128;
const MAX_DRAG = 220;

export function RoleRevealScreen({
  players,
  onDone,
  title = "🐺 Rollenaufdeckung",
  instructionText,
  doneLabel,
  showRoleInfo = false,
  showRoleInfoIdentity = true,
}: RoleRevealScreenProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);
  const [roleInfoId, setRoleInfoId] = useState<RoleId | null>(null);

  const startYRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const settlingRef = useRef(false);

  const currentPlayer = players[currentIdx];
  const isRevealed = dragOffset >= DRAG_THRESHOLD;
  const isLast = currentIdx === players.length - 1;

  const role = currentPlayer ? getRoleDisplay(currentPlayer) : null;

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (settlingRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startYRef.current = e.clientY;
    setIsDragging(true);
    setDragOffset(0);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const delta = Math.max(0, startYRef.current - e.clientY);
      setDragOffset(delta);
      if (delta >= DRAG_THRESHOLD) {
        setHasRevealed(true);
      }
    },
    [isDragging],
  );

  const onPointerUp = useCallback(() => {
    setIsDragging(false);
    if (dragOffset > 0) {
      settlingRef.current = true;
      setIsSettling(true);
    }
    setDragOffset(0);
  }, [dragOffset]);

  const onTransitionEnd = useCallback(() => {
    settlingRef.current = false;
    setIsSettling(false);
  }, []);

  const handleNext = useCallback(() => {
    if (isDragging || isSettling || !hasRevealed) return;
    if (isLast) {
      onDone();
    } else {
      setCurrentIdx(i => i + 1);
      setDragOffset(0);
      setIsDragging(false);
      settlingRef.current = false;
      setIsSettling(false);
      setHasRevealed(false);
      setRoleInfoId(null);
    }
  }, [isDragging, isSettling, hasRevealed, isLast, onDone]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (settlingRef.current || isDragging) return;
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    if (!hasRevealed) {
      setDragOffset(DRAG_THRESHOLD + 1);
      setHasRevealed(true);
    } else {
      handleNext();
    }
  }, [isDragging, hasRevealed, handleNext]);

  if (!currentPlayer) return null;
  const defaultInstructionText = players.length === 1
    ? "Zeige deine Rolle"
    : `Gib das Gerät an ${currentPlayer.name} weiter`;
  const roleInfoAvailable = showRoleInfo && hasRevealed && currentPlayer.role !== null;

  // Card translates upward; capped so it doesn't fully leave the screen
  const translateY = Math.min(dragOffset, MAX_DRAG);

  return (
    <div className="h-full bg-gradient-to-b from-indigo-950 to-gray-950 text-white flex flex-col overflow-hidden select-none">

      {/* Sticky header: title and player progress dots */}
      <header className="sticky top-0 z-10 bg-indigo-950/90 backdrop-blur border-b border-white/10 px-4 pt-4 pb-3 flex flex-col items-center gap-2">
        <h1 className="text-xl font-bold text-white">{title}</h1>

        {/* Dot-step progress indicators */}
        <div className="flex gap-3" role="status" aria-label={`Spieler ${currentIdx + 1} von ${players.length}`}>
          {players.map((_, i) => (
            <span
              key={i}
              className={`rounded-full transition-all ${
                i < currentIdx
                  ? "w-3 h-3 bg-purple-500"
                  : i === currentIdx
                    ? "w-4 h-4 bg-white"
                    : "w-3 h-3 bg-gray-700"
              }`}
            />
          ))}
        </div>
      </header>

      {/* Scrollable body: badge, instruction, and drag card */}
      <main className="flex-1 overflow-y-auto min-h-0 flex flex-col items-center justify-center px-4 py-6">
        {/* Player name badge */}
        <div className="bg-white/10 border border-white/20 rounded-2xl px-8 py-4 mb-6 text-center">
          <p className="text-gray-400 text-sm mb-1">Karte für</p>
          <h2 className="text-4xl font-bold">{currentPlayer.name}</h2>
        </div>

        {/* Hand-off instruction */}
        <p className="text-gray-400 text-sm text-center mb-4">
          {instructionText ?? defaultInstructionText}
        </p>

        {/* Stacking area: role beneath, card on top */}
        <div className="relative w-56 h-80">
          {/* Role layer, revealed as the card slides up */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-600"
            aria-hidden={!isRevealed}
          >
            {role ? (
              <>
                <span className="text-5xl" style={{ opacity: 0.8 }}>{role.icon}</span>
                <span className="text-xl font-bold text-gray-400 text-center px-3 leading-snug">{role.label}</span>
              </>
            ) : (
              <span className="text-gray-500">Keine Rolle</span>
            )}
          </div>

          {/* Draggable cover card, playing-card style */}
          <div
            ref={cardRef}
            role="button"
            tabIndex={0}
            aria-label={`Rollenkarte für ${currentPlayer.name}: hochziehen oder Leertaste drücken um zu enthüllen`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onTransitionEnd={onTransitionEnd}
            onKeyDown={onKeyDown}
            style={{
              transform: `translateY(-${translateY}px)`,
              transition: isDragging ? "none" : "transform 0.2s ease",
              touchAction: "none",
              boxShadow: "0 4px 8px rgba(0,0,0,0.6), 0 12px 36px rgba(88,28,135,0.5)",
            }}
            className="absolute inset-0 rounded-3xl cursor-grab active:cursor-grabbing overflow-hidden bg-gradient-to-b from-indigo-900 to-purple-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            {/* Decorative inset border */}
            <div className="absolute inset-3 rounded-2xl border border-white/20" />

            {/* Corner suit marker, top-left */}
            <span className="absolute top-3 left-3 text-2xl pointer-events-none" style={{ opacity: 0.4 }}>🐺</span>
            {/* Corner suit marker, bottom-right */}
            <span className="absolute bottom-3 right-3 text-2xl pointer-events-none" style={{ opacity: 0.4 }}>🐺</span>

            {/* Large centered wolf watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-9xl" style={{ opacity: 0.3 }}>🐺</span>
            </div>

            {/* Instruction text at bottom of card */}
            <div className="absolute bottom-10 left-0 right-0 text-center px-3">
              <p className="text-purple-300 text-xs leading-snug">↑ Hochziehen / Leertaste</p>
            </div>
          </div>

        </div>
      </main>

      {/* Sticky footer: next button, hint, and counter */}
      <footer className="sticky bottom-0 bg-indigo-950/90 backdrop-blur border-t border-white/10 px-4 py-4 flex flex-col items-center gap-2">
        {showRoleInfo ? (
          <div className="flex w-full max-w-xs items-center justify-center gap-2">
            <Btn
              onClick={handleNext}
              disabled={isDragging || isSettling || !hasRevealed}
              cls="bg-purple-600 hover:bg-purple-500 text-white flex-1 min-w-0"
              size="lg"
            >
              {isLast ? doneLabel ?? "Spiel starten →" : "Weiter →"}
            </Btn>
            <button
              type="button"
              onClick={() => {
                if (currentPlayer.role) setRoleInfoId(currentPlayer.role);
              }}
              disabled={!roleInfoAvailable}
              aria-hidden={!roleInfoAvailable}
              tabIndex={roleInfoAvailable ? 0 : -1}
              aria-label="Rollenbeschreibung anzeigen"
              className={`w-12 h-12 rounded-xl border border-white/20 bg-gray-800 hover:bg-gray-700 text-lg transition-all active:scale-95 disabled:pointer-events-none ${
                roleInfoAvailable ? "opacity-100" : "invisible"
              }`}
            >
              ℹ️
            </button>
          </div>
        ) : (
          <Btn
            onClick={handleNext}
            disabled={isDragging || isSettling || !hasRevealed}
            cls="bg-purple-600 hover:bg-purple-500 text-white w-64"
            size="lg"
          >
            {isLast ? doneLabel ?? "Spiel starten →" : "Weiter →"}
          </Btn>
        )}

        <p className={`text-gray-500 text-xs text-center ${hasRevealed ? "invisible" : "visible"}`}>
          Karte hochziehen um fortzufahren
        </p>

        {/* Player counter */}
        <p className="text-gray-700 text-xs text-center">Spieler {currentIdx + 1} von {players.length}</p>
      </footer>

      {roleInfoId && (
        <RoleInfoModal
          roleId={roleInfoId}
          onClose={() => setRoleInfoId(null)}
          showRoleIdentity={showRoleInfoIdentity}
        />
      )}
    </div>
  );
}
