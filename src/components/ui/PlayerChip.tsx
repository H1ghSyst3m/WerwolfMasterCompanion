import { getRoleDisplay } from "../../domain/roleDisplay";
import type { Player } from "../../types";

interface PlayerChipProps {
  p: Player;
  selected?: boolean;
  onClick?: () => void;
  showRole?: boolean;
  extra?: React.ReactNode;
  disabled?: boolean;
}

export function PlayerChip({
  p,
  selected = false,
  onClick,
  showRole = false,
  extra = null,
  disabled = false,
}: PlayerChipProps) {
  const display = getRoleDisplay(p);

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all active:scale-95 w-full text-left ${
        disabled || !p.alive
          ? "opacity-30 border-gray-700 bg-gray-900 pointer-events-none"
          : selected
            ? "border-purple-400 bg-purple-900/50"
            : "border-gray-600 bg-gray-800 hover:border-gray-400"
      }`}
      disabled={disabled || !p.alive}
    >
      <span className="text-lg">{p.alive ? (p.lover !== null ? "💕" : "🟢") : "💀"}</span>
      <span className="flex-1 font-medium truncate">{p.name}</span>
      {extra}
      {showRole && display && (
        <span className="text-sm opacity-70">
          {display.labelWithIcon}
        </span>
      )}
    </button>
  );
}
