import "server-only";
import { getAll } from "@/lib/sheets";
import type { AuthUser } from "./permissions";

const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

/**
 * Looks up an email in the Users tab (the allow list). Emails in ADMIN_EMAILS
 * are always allowed as Admin, so the first admin can sign in before the
 * Users tab has any rows. Returns null when the email is not allowed.
 */
export async function resolveUser(email: string | null | undefined): Promise<AuthUser | null> {
  if (!email) return null;
  const e = email.trim().toLowerCase();
  const users = await getAll("Users");
  const u = users.find((x) => x.email.trim().toLowerCase() === e);
  if (u) return { id: u.id, email: e, name: u.name || e, role: u.role, company_ids: u.company_ids };
  if (adminEmails().includes(e)) return { id: `env:${e}`, email: e, name: e.split("@")[0], role: "Admin", company_ids: ["*"] };
  return null;
}
