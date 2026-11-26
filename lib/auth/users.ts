import "server-only";
import { timingSafeEqual } from "node:crypto";
import { getAll } from "@/lib/sheets";
import { verifyPassword } from "./password";
import type { AuthUser } from "./permissions";

/**
 * Optional emergency admin from the server settings (ADMIN_USERNAME and
 * ADMIN_PASSWORD). It lets the first admin sign in before the Users tab has
 * any rows, and works even if someone breaks the Users tab.
 */
export const envAdmin = () => {
  const username = (process.env.ADMIN_USERNAME ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  return username && password ? { username, password } : null;
};

const toAuth = (u: { id: string; email: string; name: string; role: AuthUser["role"]; company_ids: string[] }): AuthUser => ({
  id: u.id,
  email: u.email.trim().toLowerCase(),
  name: u.name || u.email,
  role: u.role,
  company_ids: u.company_ids,
});

/** Looks up a sign-in name in the Users tab. Returns null when the user does not exist or was removed. */
export async function resolveUser(login: string | null | undefined): Promise<AuthUser | null> {
  if (!login) return null;
  const e = login.trim().toLowerCase();
  const env = envAdmin();
  const asEnvAdmin = (): AuthUser => ({ id: `env:${e}`, email: e, name: e.split("@")[0], role: "Admin", company_ids: ["*"] });
  let users;
  try {
    users = await getAll("Users");
  } catch (err) {
    // The emergency admin must work even when the sheet can't be reached, so they can fix the setup.
    if (env && env.username === e) return asEnvAdmin();
    throw err;
  }
  const u = users.find((x) => x.email.trim().toLowerCase() === e);
  if (u) return toAuth(u);
  if (env && env.username === e) return asEnvAdmin();
  return null;
}

/* ---------- Brute-force guard: 5 wrong passwords lock the name for 15 minutes ---------- */
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const g = globalThis as unknown as { __adsHubFails?: Map<string, { n: number; at: number }> };
const fails = (g.__adsHubFails ??= new Map());

export function isLocked(login: string) {
  const f = fails.get(login);
  return !!f && f.n >= MAX_FAILS && Date.now() - f.at < LOCK_MS;
}
function noteFail(login: string) {
  const f = fails.get(login);
  const fresh = !f || Date.now() - f.at > LOCK_MS;
  fails.set(login, { n: fresh ? 1 : f.n + 1, at: Date.now() });
}

const sameText = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Checks a sign-in name and password. Returns the user, or a reason it failed. */
export async function checkCredentials(loginRaw: string, password: string): Promise<{ user: AuthUser } | { error: "invalid" | "locked" | "database" }> {
  const login = loginRaw.trim().toLowerCase();
  if (!login || !password) return { error: "invalid" };
  if (isLocked(login)) return { error: "locked" };
  let users;
  try {
    users = await getAll("Users");
  } catch (err) {
    console.error("[login] could not read the Users tab:", (err as Error).message);
    const env = envAdmin();
    if (env && env.username === login && sameText(password, env.password)) {
      fails.delete(login);
      return { user: { id: `env:${login}`, email: login, name: login.split("@")[0], role: "Admin", company_ids: ["*"] } };
    }
    return { error: "database" };
  }
  const row = users.find((x) => x.email.trim().toLowerCase() === login);
  let ok = false;
  let user: AuthUser | null = null;
  if (row?.password_hash) {
    ok = await verifyPassword(password, row.password_hash);
    user = toAuth(row);
  } else if (!row) {
    const env = envAdmin();
    if (env && env.username === login && sameText(password, env.password)) {
      ok = true;
      user = await resolveUser(login);
    }
  }
  if (!ok || !user) {
    noteFail(login);
    return { error: isLocked(login) ? "locked" : "invalid" };
  }
  fails.delete(login);
  return { user };
}
