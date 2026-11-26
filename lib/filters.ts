import { addDays, diffDays, monthStart, todayISO } from "./dates";

export const PRESETS = ["today", "last_7", "last_30", "this_month", "last_month", "custom"] as const;
export type Preset = (typeof PRESETS)[number];

export interface Filters {
  preset: Preset;
  from: string;
  to: string;
  compare: boolean;
  company: string;
  platform: string;
  buyer: string;
  status: string;
}

export type SearchParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const iso = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

/** Reads the dashboard filters from the URL. Default: last 30 days with comparison. */
export function parseFilters(sp: SearchParams, today = todayISO()): Filters {
  const preset = (PRESETS as readonly string[]).includes(one(sp.range)) ? (one(sp.range) as Preset) : "last_30";
  let from = "";
  let to = "";
  switch (preset) {
    case "today":
      from = to = today;
      break;
    case "last_7":
      from = addDays(today, -7);
      to = addDays(today, -1);
      break;
    case "this_month":
      from = monthStart(today);
      to = today;
      break;
    case "last_month":
      to = addDays(monthStart(today), -1);
      from = monthStart(to);
      break;
    case "custom":
      from = iso(one(sp.from)) || addDays(today, -30);
      to = iso(one(sp.to)) || addDays(today, -1);
      if (to < from) [from, to] = [to, from];
      break;
    default:
      from = addDays(today, -30);
      to = addDays(today, -1);
  }
  return {
    preset,
    from,
    to,
    compare: one(sp.compare) !== "0",
    company: one(sp.company),
    platform: one(sp.platform),
    buyer: one(sp.buyer),
    status: one(sp.status),
  };
}

/** The period of equal length right before [from, to]. */
export function previousPeriod(from: string, to: string) {
  const len = diffDays(from, to) + 1;
  return { from: addDays(from, -len), to: addDays(from, -1) };
}
