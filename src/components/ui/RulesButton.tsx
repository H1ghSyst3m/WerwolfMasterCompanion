import { useState } from "react";
import { createPortal } from "react-dom";
import { RoleRulesModal } from "./RoleRulesModal";

interface RulesButtonProps {
  cls?: string;
}

export function RulesButton({ cls = "" }: RulesButtonProps) {
  const [open, setOpen] = useState(false);
  const portalTarget = typeof document === "undefined" ? null : document.body;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Rollenregeln anzeigen"
        title="Rollenregeln"
        className={`rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-100 border border-gray-700 px-3 py-1.5 text-sm font-semibold transition-all active:scale-95 ${cls}`}
      >
        📖
      </button>
      {open && portalTarget
        ? createPortal(<RoleRulesModal onClose={() => setOpen(false)} />, portalTarget)
        : null}
    </>
  );
}
