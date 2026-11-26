import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { cache } from "react";
import { can, ForbiddenError, type AuthUser, type Permission } from "./permissions";
import { resolveUser } from "./users";

/**
 * The signed-in user with their current role, read from the Users tab (cached)
 * on every request. A removed user or a role change takes effect right away,
 * not only when the session token refreshes.
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  return resolveUser(email);
});

/** For pages: redirects to /login when signed out, shows 403 page when not allowed. */
export async function requirePage(permission?: Permission, companyId?: string): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect((await auth()) ? "/signout" : "/login");
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
