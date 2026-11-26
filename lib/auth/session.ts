import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { can, ForbiddenError, type AuthUser, type Permission } from "./permissions";

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await auth();
  const u = session?.user;
  if (!u?.email) return null;
  return { id: u.id, email: u.email, name: u.name ?? u.email, role: u.role, company_ids: u.company_ids ?? [] };
}

/** For pages: redirects to /login when signed out, shows 403 page when not allowed. */
export async function requirePage(permission?: Permission, companyId?: string): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (permission && !can(user, permission, companyId)) redirect("/forbidden");
  return user;
}

/** For Server Actions and API routes: throws ForbiddenError. */
export async function authorize(permission: Permission, companyId?: string): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError("not signed in");
  if (!can(user, permission, companyId)) throw new ForbiddenError();
  return user;
}
