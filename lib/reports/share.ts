import "server-only";
import { randomBytes } from "node:crypto";
import { resolveUser } from "@/lib/auth/users";
import type { AuthUser } from "@/lib/auth/permissions";
import { getAll, insert, softDelete } from "@/lib/sheets";
import { parseReportParams, reportQuery, type ReportParams } from "./params";

export const TEMP_PDF_TYPE = "pdf-temp";

/** Stores the report params (dates fixed or preset) under an unguessable token. */
export async function createLink(user: AuthUser, p: ReportParams, opts: { days?: number; minutes?: number; fixedDates?: boolean; kind?: string }) {
  const token = randomBytes(24).toString("base64url");
  const ms = opts.minutes ? opts.minutes * 60_000 : (opts.days ?? 7) * 86_400_000;
  const row = await insert("ShareLinks", { token, report_type: opts.kind ?? p.type, params: reportQuery(p, opts.fixedDates), expires_at: new Date(Date.now() + ms).toISOString() }, user.email);
  return row;
}

/** Valid, unexpired link -> the report params and the user whose access it carries (its creator). */
export async function resolveLink(token: string) {
  if (!token || token.length < 20) return null;
  const link = (await getAll("ShareLinks")).find((l) => l.token === token);
  if (!link || link.expires_at < new Date().toISOString()) return null;
  const owner = await resolveUser(link.created_by);
  if (!owner) return null; // creator removed or deactivated: the link stops working
  const params = parseReportParams(Object.fromEntries(new URLSearchParams(link.params)));
  return { link, owner, params };
}

export async function revokeLink(id: string, actor: string) {
  return softDelete("ShareLinks", id, actor);
}

export async function listLinks(user: AuthUser) {
  const now = new Date().toISOString();
  return (await getAll("ShareLinks"))
    .filter((l) => l.report_type !== TEMP_PDF_TYPE && l.expires_at > now && (user.role === "Admin" || l.created_by === user.email))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
