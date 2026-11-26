import type { Role } from "@/types/entities";

/**
 * Single source of truth for who can do what. Used by the sidebar, pages,
 * Server Actions and API routes, so hiding a button is never the only guard.
 */
export const PERMISSIONS = {
  "dashboard:view": ["Admin", "Manager", "MediaBuyer", "Viewer"],
  "company:view": ["Admin", "Manager", "MediaBuyer", "Designer", "Viewer"],
  "company:manage": ["Admin", "Manager"],
  "campaign:view": ["Admin", "Manager", "MediaBuyer", "Viewer"],
  "campaign:manage": ["Admin", "Manager", "MediaBuyer"],
  "results:import": ["Admin", "Manager", "MediaBuyer"],
  "creative:view": ["Admin", "Manager", "MediaBuyer", "Designer", "Viewer"],
  "creative:manage": ["Admin", "Manager", "Designer"],
  "creative:approve": ["Admin", "Manager"],
  "schedule:view": ["Admin", "Manager", "MediaBuyer", "Designer", "Viewer"],
  "schedule:manage": ["Admin", "Manager", "Designer"],
  "budget:view": ["Admin", "Manager", "MediaBuyer", "Viewer"],
  "budget:manage": ["Admin", "Manager"],
  "report:view": ["Admin", "Manager", "MediaBuyer", "Viewer"],
  "report:share": ["Admin", "Manager"],
  "settings:manage": ["Admin"],
  "user:manage": ["Admin"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** "*" means all companies. */
  company_ids: string[];
}

export function hasPermission(user: Pick<AuthUser, "role"> | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(user.role);
}

/** Admin and Manager see every company. Other roles only see assigned companies. */
export function canAccessCompany(user: Pick<AuthUser, "role" | "company_ids"> | null | undefined, companyId: string): boolean {
  if (!user) return false;
  if (user.role === "Admin" || user.role === "Manager") return true;
  return user.company_ids.includes("*") || user.company_ids.includes(companyId);
}

export function can(user: AuthUser | null | undefined, permission: Permission, companyId?: string): boolean {
  if (!hasPermission(user, permission)) return false;
  return companyId ? canAccessCompany(user, companyId) : true;
}

/** Filters a list of records to the companies this user may see. */
export function scopeToUser<T extends { company_id: string }>(user: AuthUser, rows: T[]): T[] {
  if (user.role === "Admin" || user.role === "Manager" || user.company_ids.includes("*")) return rows;
  const allowed = new Set(user.company_ids);
  return rows.filter((r) => allowed.has(r.company_id));
}

/** Where a role lands after sign in. */
export function homeFor(role: Role): string {
  return role === "Designer" ? "/creatives" : "/";
}

export class ForbiddenError extends Error {
  constructor(message = "forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}
