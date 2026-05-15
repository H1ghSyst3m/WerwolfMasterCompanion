import { getRoleDisplay } from "../domain/roleDisplay";
import { Modal } from "./ui/Modal";
import { Btn } from "./ui/Btn";
import { RoleInfoModal } from "./ui/RoleInfoModal";
import type { Player, RoleId } from "../types";

interface PlayerOverlayProps {
  players: Player[];
  roleInfoId: RoleId | null;
  setRoleInfoId: (id: RoleId | null) => void;
  onClose: () => void;
}

export function PlayerOverlay({ players, roleInfoId, setRoleInfoId, onClose }: PlayerOverlayProps) {
  return (
    <>
      <Modal onClose={onClose}>
        <h2 className="text-lg font-bold mb-3">👥 Spielerübersicht</h2>
        <p className="text-gray-500 text-xs mb-3">Rolle antippen für Beschreibung</p>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {players.map(p => {
            const display = getRoleDisplay(p);
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between rounded-xl px-3 py-2 ${p.alive ? "bg-gray-700" : "bg-gray-800 opacity-50"}`}
              >
                <span>{p.alive ? "🟢" : "💀"} {p.name} {p.lover != null ? "💕" : ""}</span>
                <button
                  onClick={() => p.role && setRoleInfoId(p.role)}
                  disabled={!p.role}
                  aria-label={display ? `Mehr Informationen zu ${display.name}` : "Keine Rolleninformation verfügbar"}
                  className={`text-sm hover:underline${!p.role ? " opacity-40 cursor-not-allowed pointer-events-none" : ""}`}
                >
                  {display?.labelWithIcon ?? ""}
                </button>
              </div>
            );
          })}
        </div>
        <Btn onClick={onClose} cls="bg-gray-700 text-white w-full mt-4">Schließen</Btn>
      </Modal>

      {roleInfoId && <RoleInfoModal roleId={roleInfoId} onClose={() => setRoleInfoId(null)} />}
    </>
  );
}
