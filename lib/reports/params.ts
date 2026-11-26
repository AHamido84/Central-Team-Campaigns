import { parseFilters, PRESETS, type Preset, type SearchParams } from "@/lib/filters";

export const REPORT_TYPES = ["company", "consolidated", "buyer"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];
export const REPORT_SECTIONS = ["kpis", "daily", "platforms", "campaigns", "creatives", "budget", "alerts"] as const;
export type ReportSection = (typeof REPORT_SECTIONS)[number];

export interface ReportParams {
  type: ReportType;
  company: string;
  buyer: string;
  preset: Preset;
  from: string;
  to: string;
  compare: boolean;
  sections: ReportSection[];
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseReportParams(sp: SearchParams, today?: string): ReportParams {
  const type = (REPORT_TYPES as readonly string[]).includes(one(sp.type)) ? (one(sp.type) as ReportType) : "consolidated";
  const f = parseFilters({ ...sp, range: (PRESETS as readonly string[]).includes(one(sp.range)) ? one(sp.range) : "last_month" }, today);
  const raw = one(sp.sections);
  const sections = raw ? (raw.split(",").filter((s) => (REPORT_SECTIONS as readonly string[]).includes(s)) as ReportSection[]) : [...REPORT_SECTIONS];
  return { type, company: type === "company" ? one(sp.company) : "", buyer: type === "buyer" ? one(sp.buyer) : "", preset: f.preset, from: f.from, to: f.to, compare: f.compare, sections };
}

/** Back to URL params. A preset (except custom) is stored by name so a saved link stays "last 7 days". */
export function reportQuery(p: ReportParams, fixedDates = false): string {
  const q = new URLSearchParams({ type: p.type });
  if (p.company) q.set("company", p.company);
  if (p.buyer) q.set("buyer", p.buyer);
  if (fixedDates || p.preset === "custom") {
    q.set("range", "custom");
    q.set("from", p.from);
    q.set("to", p.to);
  } else q.set("range", p.preset);
  if (!p.compare) q.set("compare", "0");
  if (p.sections.length !== REPORT_SECTIONS.length) q.set("sections", p.sections.join(","));
  return q.toString();
}
