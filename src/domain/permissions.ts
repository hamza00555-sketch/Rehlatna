import type { HouseholdMember, HouseholdRole, Permission } from "./types";

/**
 * Role → default grants. Roles are configurable: the financial planner is
 * whoever the household assigns — never assumed to be the father. Members
 * may hold several roles; grants are unioned and then editable per member.
 */
export const ROLE_PERMISSIONS: Record<HouseholdRole, Permission[]> = {
  mother: [
    "journey:view",
    "journey:edit",
    "appointments:view",
    "appointments:edit",
    "preparation:view",
    "preparation:edit",
    "care:view",
    "care:edit",
    "household:manage",
  ],
  partner: [
    "journey:view",
    "journey:edit",
    "appointments:view",
    "appointments:edit",
    "preparation:view",
    "preparation:edit",
    "care:view",
    "care:edit",
    "household:manage",
  ],
  financial_planner: ["finance:view", "finance:edit", "preparation:view"],
  family_supporter: ["journey:view", "appointments:view", "preparation:view"],
};

export const ALL_PERMISSIONS: Permission[] = [
  "journey:view",
  "journey:edit",
  "appointments:view",
  "appointments:edit",
  "preparation:view",
  "preparation:edit",
  "care:view",
  "care:edit",
  "finance:view",
  "finance:edit",
  "household:manage",
];

export function permissionsForRoles(roles: HouseholdRole[]): Permission[] {
  const set = new Set<Permission>();
  for (const role of roles) for (const p of ROLE_PERMISSIONS[role]) set.add(p);
  return ALL_PERMISSIONS.filter((p) => set.has(p));
}

/** Viewer context threaded through every serializer and route handler. */
export interface Viewer {
  userId: string;
  memberId: string;
  householdId: string;
  permissions: Permission[];
}

export function can(viewer: Viewer, permission: Permission): boolean {
  return viewer.permissions.includes(permission);
}

export class PermissionError extends Error {
  readonly permission: Permission;
  constructor(permission: Permission) {
    super(`missing permission: ${permission}`);
    this.name = "PermissionError";
    this.permission = permission;
  }
}

export function assertCan(viewer: Viewer, permission: Permission): void {
  if (!can(viewer, permission)) throw new PermissionError(permission);
}

export function viewerFromMember(member: HouseholdMember): Viewer {
  return {
    userId: member.userId,
    memberId: member.id,
    householdId: member.householdId,
    permissions: member.permissions,
  };
}
