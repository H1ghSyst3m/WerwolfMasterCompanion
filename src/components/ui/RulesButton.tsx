import { useState } from "react";
import { RoleRulesModal } from "./RoleRulesModal";

interface RulesButtonProps {
  cls?: string;
  label?: string;
}

export function RulesButton({ cls = "", label = "📖 Regeln" }: RulesButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Rollenregeln anzeigen"
        className={`rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-100 border border-gray-700 px-3 py-1.5 text-sm font-semibold transition-all active:scale-95 ${cls}`}
      >
        {label}
      </button>
      {open && <RoleRulesModal onClose={() => setOpen(false)} />}
    </>
  );
}
