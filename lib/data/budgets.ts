import "server-only";
import { scopeToUser, type AuthUser } from "@/lib/auth/permissions";
import { addDays, daysInMonth, diffDays, todayISO } from "@/lib/dates";
import { metricsOf } from "@/lib/metrics";
import { getAll } from "@/lib/sheets";
import { companyName } from "./analytics";

export interface PlatformLine {
  platform_id: string;
  platform: string;
  planned: number;
  spent: number;
  projected: number;
}
export interface CompanyPlan {
  id: string;
  name: string;
  currency: string;
  lines: PlatformLine[];
  planned: number;
  spent: number;
  projected: number;
  target: { leads: number; cpl: number; roas: number; spend: number } | null;
  actual: { leads: number; cpl: number | null; roas: number | null; purchases: number };
  /** Cumulative spend per day vs the straight-line plan. */
  daily: { date: string; actual: number | null; plan: number }[];
}

export type MonthPhase = "past" | "current" | "future";

/** Month bounds and how far through it we are. Projection uses the last day that has data. */
export function monthInfo(month: string, today = todayISO()) {
  const from = `${month}-01`;
  const days = daysInMonth(from);
  const to = `${month}-${String(days).padStart(2, "0")}`;
  const phase: MonthPhase = today < from ? "future" : today > to ? "past" : "current";
  return { from, to, days, phase };
}

export function project(spent: number, lastDataDay: string, month: string, today = todayISO()) {
  const m = monthInfo(month, today);
  if (m.phase !== "current") return spent;
  if (!lastDataDay) return 0;
  const elapsed = diffDays(m.from, lastDataDay) + 1;
  return (spent / Math.max(1, elapsed)) * m.days;
}

export async function budgetOverview(user: AuthUser, month: string, locale: string, companyFilter = "") {
  const [companies, platforms, budgets, targets, results] = await Promise.all([getAll("Companies"), getAll("Platforms", { includeDeleted: true }), getAll("Budgets"), getAll("Targets"), getAll("DailyResults")]);
  const m = monthInfo(month);
  const scoped = scopeToUser(user, companies.map((c) => ({ ...c, company_id: c.id }))).filter((c) => c.status !== "archived" && (!companyFilter || c.id === companyFilter));
  const pName = new Map(platforms.map((p) => [p.id, p.name]));
  const activePlatforms = platforms.filter((p) => p.is_active && !p.is_deleted);
  const monthRows = results.filter((r) => r.date >= m.from && r.date <= m.to);
  const lastDataDay = monthRows.reduce((d, r) => (r.date > d ? r.date : d), "");

  const plans: CompanyPlan[] = scoped.map((c) => {
    const rows = monthRows.filter((r) => r.company_id === c.id);
    const b = budgets.filter((x) => x.company_id === c.id && x.month === month);
    const ids = new Set([...b.map((x) => x.platform_id), ...rows.map((r) => r.platform_id)]);
    const lines: PlatformLine[] = [...ids]
      .map((pid) => {
        const spent = rows.filter((r) => r.platform_id === pid).reduce((s, r) => s + r.spend, 0);
        return { platform_id: pid, platform: pName.get(pid) ?? "—", planned: b.filter((x) => x.platform_id === pid).reduce((s, x) => s + x.planned_budget, 0), spent, projected: project(spent, lastDataDay, month) };
      })
      .sort((a, b2) => b2.planned - a.planned || b2.spent - a.spent);
    const planned = lines.reduce((s, l) => s + l.planned, 0);
    const spent = lines.reduce((s, l) => s + l.spent, 0);
    const t = targets.find((x) => x.company_id === c.id && x.month === month && !x.platform_id);
    const mm = metricsOf(rows);
    let cum = 0;
    const daily: CompanyPlan["daily"] = [];
    for (let d = m.from, i = 1; d <= m.to; d = addDays(d, 1), i++) {
      cum += rows.filter((r) => r.date === d).reduce((s, r) => s + r.spend, 0);
      daily.push({ date: d, actual: lastDataDay && d <= lastDataDay ? Math.round(cum) : null, plan: Math.round((planned / m.days) * i) });
    }
    return {
      id: c.id,
      name: companyName(c, locale),
      currency: c.currency || "SAR",
      lines,
      planned,
      spent,
      projected: project(spent, lastDataDay, month),
      target: t ? { leads: t.target_leads, cpl: t.target_cpl, roas: t.target_roas, spend: t.target_spend } : null,
      actual: { leads: mm.leads, cpl: mm.cpl, roas: mm.purchase_value > 0 ? mm.roas : null, purchases: mm.purchases },
      daily,
    };
  });
  return {
    month,
    phase: m.phase,
    days: m.days,
    lastDataDay,
    elapsedShare: m.phase === "past" ? 1 : m.phase === "future" ? 0 : lastDataDay ? (diffDays(m.from, lastDataDay) + 1) / m.days : 0,
    plans,
    platforms: activePlatforms.map((p) => ({ id: p.id, name: p.name })),
  };
}
export type BudgetOverview = Awaited<ReturnType<typeof budgetOverview>>;
