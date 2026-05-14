import { ROLES } from "../../constants/roles";
import type { RoleId } from "../../types";
import { Btn } from "./Btn";
import { Modal } from "./Modal";

interface RoleInfoModalProps {
  roleId: RoleId;
  onClose: () => void;
  showRoleIdentity?: boolean;
}

export function RoleInfoModal({ roleId, onClose, showRoleIdentity = true }: RoleInfoModalProps) {
  const role = ROLES[roleId];
  if (!role) return null;

  return (
    <Modal onClose={onClose} ariaLabel={showRoleIdentity ? `Rollenbeschreibung ${role.name}` : "Rollenbeschreibung"}>
      <div className="text-center">
        {showRoleIdentity ? (
          <>
            <div className="text-5xl mb-3">{role.icon}</div>
            <h2 className="text-xl font-bold mb-1">{role.name}</h2>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4 ${
              role.team === "wolf" ? "bg-red-900/50 text-red-400" : "bg-green-900/50 text-green-400"
            }`}>
              {role.team === "wolf" ? "🐺 Böse" : "🏘️ Gut"}
            </span>
          </>
        ) : (
          <h2 className="text-lg font-bold mb-4">Rollenbeschreibung</h2>
        )}
        <p className="text-gray-300 text-sm leading-relaxed">{role.desc}</p>
      </div>
      <Btn onClick={onClose} cls="bg-gray-700 text-white w-full mt-5">Schließen</Btn>
    </Modal>
  );
}
