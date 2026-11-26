import "server-only";
import { getAll } from "@/lib/sheets";

export async function listPlatforms(opts: { activeOnly?: boolean } = {}) {
  const all = await getAll("Platforms");
  return all.filter((p) => !opts.activeOnly || p.is_active).sort((a, b) => a.name.localeCompare(b.name));
}

/** People who can own campaigns (for the media buyer picker). */
export async function listMediaBuyers() {
  const users = await getAll("Users");
  return users
    .filter((u) => u.role === "MediaBuyer" || u.role === "Manager" || u.role === "Admin")
    .map((u) => ({ email: u.email, name: u.name || u.email }));
}

export async function userNameMap() {
  const users = await getAll("Users");
  return Object.fromEntries(users.map((u) => [u.email, u.name || u.email]));
}
