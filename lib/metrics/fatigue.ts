import { metricsOf } from "./index";
import { addDays } from "../dates";

export type FatigueLevel = "fatigued" | "watch" | "healthy" | "unknown";

type Row = { date: string; impressions: number; reach: number; link_clicks: number; clicks: number; spend: number };

/**
 * Ad fatigue: compares the last 7 days with the 7 days before.
 * - fatigued: link CTR fell 25% or more AND frequency is 3 or higher (or rose 30%+)
 * - watch: link CTR fell 15% or more, or frequency is above 3
 * Needs at least 1,000 impressions in each window, else "unknown".
 */
export function fatigueOf(rows: Row[], endDate: string) {
  const last = rows.filter((r) => r.date > addDays(endDate, -7) && r.date <= endDate);
  const before = rows.filter((r) => r.date > addDays(endDate, -14) && r.date <= addDays(endDate, -7));
  const a = metricsOf(last);
  const b = metricsOf(before);
  const ctrA = a.link_clicks ? a.link_ctr : a.ctr;
  const ctrB = b.link_clicks ? b.link_ctr : b.ctr;
  const result = { level: "unknown" as FatigueLevel, ctrChange: null as number | null, frequency: a.frequency, frequencyChange: null as number | null };
  if (a.impressions < 1000 || b.impressions < 1000 || ctrA === null || !ctrB) return result;
  result.ctrChange = ctrA / ctrB - 1;
  result.frequencyChange = a.frequency !== null && b.frequency ? a.frequency / b.frequency - 1 : null;
  const freq = a.frequency ?? 0;
  if (result.ctrChange <= -0.25 && (freq >= 3 || (result.frequencyChange ?? 0) >= 0.3)) result.level = "fatigued";
  else if (result.ctrChange <= -0.15 || freq > 3) result.level = "watch";
  else result.level = "healthy";
  return result;
}
