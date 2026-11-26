import { NextResponse, type NextRequest } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import * as XLSX from "xlsx";
import { ForbiddenError } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { buildReport } from "@/lib/data/reports";
import type { MetricKey, Metrics } from "@/lib/metrics";
import { parseReportParams } from "@/lib/reports/params";

export const runtime = "nodejs";

const COLS: MetricKey[] = ["spend", "impressions", "reach", "clicks", "link_clicks", "ctr", "link_ctr", "cpc", "cpm", "frequency", "results", "cost_per_result", "leads", "cpl", "messages", "purchases", "purchase_value", "roas"];
const PCT = new Set<MetricKey>(["ctr", "link_ctr"]);
const round = (v: number | null) => (v === null ? null : Math.round(v * 10000) / 10000);

/** Excel export: one sheet per table, numbers stay numbers, sheets are right-to-left in Arabic. */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const p = parseReportParams(Object.fromEntries(req.nextUrl.searchParams));
  const [locale, t] = await Promise.all([getLocale(), getTranslations()]);
  let r;
  try {
    r = await buildReport(user, p, locale);
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw e;
  }
  const head = (first: string[]) => [...first, ...COLS.map((k) => t(`metrics.${k}`) + (PCT.has(k) ? " %" : ""))];
  const vals = (m: Metrics) => COLS.map((k) => (PCT.has(k) ? round(m[k] === null ? null : (m[k] as number) * 100) : round(m[k] as number | null)));

  const wb = XLSX.utils.book_new();
  const add = (name: string, rows: (string | number | null)[][], widths: number[]) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = widths.map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  };
  add(
    t("reports.xlsx.summary"),
    [
      [t("app.org"), t("app.team")],
      [t(`reports.type.${p.type}`), r.title || t("reports.allCompanies")],
      [t("reports.period"), `${p.from} → ${p.to}`],
      [t("reports.currency"), r.currency],
      [],
      [t("reports.xlsx.metric"), t("reports.xlsx.value"), t("reports.xlsx.previous"), t("reports.xlsx.change")],
      ...r.dash.kpis.map((k) => [t(`metrics.${k.key}`), round(k.value), round(k.prev), k.change === null ? null : round(k.change * 100)]),
    ],
    [28, 18, 18, 12],
  );
  add(t("reports.sections.platforms"), [head([t("filters.platform")]), ...r.platformLines.map((l) => [l.name, ...vals(l.m)])], [16, ...COLS.map(() => 12)]);
  if (r.companyLines.length) add(t("reports.sections.companies"), [head([t("filters.company")]), ...r.companyLines.map((l) => [l.name, ...vals(l.m)])], [22, ...COLS.map(() => 12)]);
  add(
    t("reports.sections.campaigns"),
    [head([t("campaigns.f.name"), t("filters.company"), t("filters.platform"), t("campaigns.f.objective")]), ...r.campaignLines.map((c) => [c.name, c.company, c.platform, t(`campaigns.objective.${c.objective}`), ...vals(c.m)])],
    [34, 20, 12, 12, ...COLS.map(() => 12)],
  );
  add(t("reports.xlsx.daily"), [[t("reports.xlsx.date"), t("metrics.spend"), t("metrics.results"), t("metrics.leads")], ...r.dash.daily.map((d) => [d.date, d.spend, d.results, d.leads])], [12, 12, 12, 12]);
  if (r.creatives.length) add(t("reports.sections.creatives"), [[t("creatives.creative"), t("filters.company"), t("metrics.spend"), t("metrics.cost_per_result"), "CTR %", `${t("metrics.hook_rate")} %`], ...r.creatives.map((c) => [c.title, c.company, round(c.perf.spend), round(c.perf.cpr), round(c.perf.ctr === null ? null : c.perf.ctr * 100), round(c.perf.hook === null ? null : c.perf.hook * 100)])], [40, 20, 12, 12, 10, 10]);
  if (locale === "ar") wb.Workbook = { Views: [{ RTL: true }] };

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(buf), {
    headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="qaswarah-report-${p.type}-${p.from}_${p.to}.xlsx"`, "Cache-Control": "no-store" },
  });
}
