import { ROLES } from "../constants/roles";
import type { Player, RoleId } from "../types";

type RoleDisplayPlayer = Pick<Player, "role" | "originalRole">;

export interface RoleDisplay {
  roleId: RoleId;
  icon: string;
  name: string;
  label: string;
  labelWithIcon: string;
}

export function getRoleDisplay(
  player: RoleDisplayPlayer,
  effectiveRole?: RoleId | null | undefined,
): RoleDisplay | null {
  const roleId = effectiveRole ?? player.role;
  if (!roleId) return null;

  const role = ROLES[roleId];
  if (!role) return null;

  const originalRole = player.originalRole;
  const currentLabel = role.name;
  const currentLabelWithIcon = `${role.icon} ${role.name}`;
  const showFormer = (effectiveRole === undefined || effectiveRole === player.role) &&
    originalRole != null &&
    originalRole !== roleId &&
    Boolean(ROLES[originalRole]);

  if (!showFormer || originalRole == null) {
    return {
      roleId,
      icon: role.icon,
      name: role.name,
      label: currentLabel,
      labelWithIcon: currentLabelWithIcon,
    };
  }

  const formerRole = ROLES[originalRole];
  const formerLabel = `ehem. ${formerRole.name}`;

  return {
    roleId,
    icon: role.icon,
    name: role.name,
    label: `${currentLabel} (${formerLabel})`,
    labelWithIcon: `${currentLabelWithIcon} (${formerLabel})`,
  };
}
