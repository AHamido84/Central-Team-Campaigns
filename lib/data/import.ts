import "server-only";
import type { AuthUser } from "@/lib/auth/permissions";
import { can, scopeToUser } from "@/lib/auth/permissions";
import { getAll } from "@/lib/sheets";
import { listCompanies } from "./companies";
import { listPlatforms } from "./lookups";

/** Companies this user may import for, active platforms and saved column mappings. */
export async function importSetup(user: AuthUser, locale: string) {
  const [companies, platforms, mappings] = await Promise.all([listCompanies(user), listPlatforms({ activeOnly: true }), getAll("ColumnMappings")]);
  return {
    companies: companies
      .filter((c) => can(user, "results:import", c.id) && c.status !== "archived")
      .map((c) => ({ id: c.id, name: locale === "en" && c.name_en ? c.name_en : c.name_ar, currency: c.currency || "SAR" })),
    platforms: platforms.map((p) => ({ id: p.id, name: p.name })),
    savedMappings: mappings.map((m) => ({ platform_id: m.platform_id, source_column: m.source_column, target_field: m.target_field })),
  };
}

export async function importHistory(user: AuthUser) {
  const [batches, companies, platforms, users] = await Promise.all([
    getAll("ImportBatches"),
    getAll("Companies", { includeDeleted: true }),
    getAll("Platforms", { includeDeleted: true }),
    getAll("Users"),
  ]);
  const cName = new Map(companies.map((c) => [c.id, c.name_ar]));
  const pName = new Map(platforms.map((p) => [p.id, p.name]));
  const uName = new Map(users.map((u) => [u.email, u.name || u.email]));
  return scopeToUser(user, batches)
    .sort((a, b) => b.imported_at.localeCompare(a.imported_at))
    .map((b) => ({ ...b, company_name: cName.get(b.company_id) ?? "—", platform_name: pName.get(b.platform_id) ?? "—", user_name: uName.get(b.imported_by) ?? b.imported_by }));
}
export type ImportHistoryRow = Awaited<ReturnType<typeof importHistory>>[number];
