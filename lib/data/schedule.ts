import "server-only";
import { scopeToUser, type AuthUser } from "@/lib/auth/permissions";
import { addDays, todayISO } from "@/lib/dates";
import { getAll } from "@/lib/sheets";
import type { CreativeSchedule } from "@/types/entities";
import { companyName } from "./analytics";

export type EffectiveStatus = "scheduled" | "published" | "late" | "cancelled";

export interface ScheduleEntry extends CreativeSchedule {
  effective: EffectiveStatus;
  creative_title: string;
  creative_type: string;
  creative_status: string;
  aspect_ratio: string;
  thumbnail_url: string;
  file_url: string;
  company_name: string;
  platform_name: string;
  campaign_name: string;
  owner_name: string;
}

/** A scheduled post whose day has passed without being published counts as late. */
export function effectiveStatus(e: Pick<CreativeSchedule, "status" | "scheduled_date">, today = todayISO()): EffectiveStatus {
  if (e.status === "scheduled" && e.scheduled_date < today) return "late";
  return e.status;
}

export interface ScheduleFilters {
  from: string;
  to: string;
  company?: string;
  platform?: string;
  status?: string;
  owner?: string;
}

export async function listSchedule(user: AuthUser, f: ScheduleFilters, locale: string): Promise<ScheduleEntry[]> {
  const [entries, creatives, companies, platforms, campaigns, users] = await Promise.all([
    getAll("CreativeSchedule"),
    getAll("Creatives", { includeDeleted: true }),
    getAll("Companies"),
    getAll("Platforms", { includeDeleted: true }),
    getAll("Campaigns", { includeDeleted: true }),
    getAll("Users"),
  ]);
  const today = todayISO();
  const scoped = scopeToUser(user, entries);
  const cr = new Map(creatives.map((c) => [c.id, c]));
  const co = new Map(companies.map((c) => [c.id, companyName(c, locale)]));
  const pl = new Map(platforms.map((p) => [p.id, p.name]));
  const ca = new Map(campaigns.map((c) => [c.id, c.name]));
  const un = new Map(users.map((u) => [u.email, u.name || u.email]));
  return scoped
    .filter((e) => e.scheduled_date >= f.from && e.scheduled_date <= f.to && (!f.company || e.company_id === f.company) && (!f.platform || e.platform_id === f.platform) && (!f.owner || e.owner === f.owner))
    .map((e) => {
      const c = cr.get(e.creative_id);
      return {
        ...e,
        effective: effectiveStatus(e, today),
        creative_title: c?.title ?? "—",
        creative_type: c?.type ?? "image",
        creative_status: c?.status ?? "",
        aspect_ratio: c?.aspect_ratio ?? "1:1",
        thumbnail_url: c?.thumbnail_url ?? "",
        file_url: c?.file_url ?? "",
        company_name: co.get(e.company_id) ?? "",
        platform_name: pl.get(e.platform_id) ?? "",
        campaign_name: ca.get(e.campaign_id) ?? "",
        owner_name: un.get(e.owner) ?? e.owner,
      };
    })
    .filter((e) => !f.status || e.effective === f.status)
    .sort((a, b) => (a.scheduled_date + (a.scheduled_time || "99:99")).localeCompare(b.scheduled_date + (b.scheduled_time || "99:99")));
}

export async function scheduleOptions(user: AuthUser, locale: string) {
  const [creatives, companies, platforms, campaigns, users] = await Promise.all([getAll("Creatives"), getAll("Companies"), getAll("Platforms"), getAll("Campaigns"), getAll("Users")]);
  const allowed = scopeToUser(user, companies.map((c) => ({ ...c, company_id: c.id }))).filter((c) => c.status !== "archived");
  const ids = new Set(allowed.map((c) => c.id));
  return {
    companies: allowed.map((c) => ({ id: c.id, name: companyName(c, locale) })),
    platforms: platforms.filter((p) => p.is_active).map((p) => ({ id: p.id, name: p.name })),
    creatives: creatives.filter((c) => ids.has(c.company_id) && c.status !== "archived").map((c) => ({ id: c.id, title: c.title, company_id: c.company_id, campaign_id: c.campaign_id, status: c.status })),
    campaigns: campaigns.filter((c) => ids.has(c.company_id)).map((c) => ({ id: c.id, name: c.name, company_id: c.company_id, platform_id: c.platform_id })),
    owners: users.filter((u) => ["Admin", "Manager", "MediaBuyer", "Designer"].includes(u.role)).map((u) => ({ email: u.email, name: u.name || u.email })),
  };
}
export type ScheduleOptions = Awaited<ReturnType<typeof scheduleOptions>>;

/** Dashboard widgets: today, the rest of this week (next 7 days), and overdue posts. */
export async function scheduleWidgets(user: AuthUser, locale: string, company = "") {
  const today = todayISO();
  const entries = await listSchedule(user, { from: addDays(today, -14), to: addDays(today, 6), company }, locale);
  return {
    today: entries.filter((e) => e.scheduled_date === today && e.effective !== "cancelled"),
    week: entries.filter((e) => e.scheduled_date > today && e.effective !== "cancelled"),
    late: entries.filter((e) => e.effective === "late"),
  };
}
