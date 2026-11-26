import { getLocale, getTranslations } from "next-intl/server";
import { Panel } from "@/components/dashboard/panels";
import { PageHeader } from "@/components/layout/page-header";
import { ExportBar } from "@/components/reports/export-bar";
import { ReportBuilder } from "@/components/reports/report-builder";
import { ReportDocument } from "@/components/reports/report-document";
import { ShareLinksList } from "@/components/reports/share-links";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePage } from "@/lib/auth/session";
import { filterOptions } from "@/lib/data/analytics";
import { userNameMap } from "@/lib/data/lookups";
import { buildReport } from "@/lib/data/reports";
import type { SearchParams } from "@/lib/filters";
import { parseReportParams, reportQuery, type ReportType } from "@/lib/reports/params";
import { listLinks } from "@/lib/reports/share";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requirePage("report:view");
  const [t, locale, sp] = await Promise.all([getTranslations(), getLocale(), searchParams]);
  const options = await filterOptions(user, locale);
  const p = parseReportParams(sp);
  const isBuyer = user.role === "MediaBuyer";
  if (isBuyer) Object.assign(p, { type: "buyer", buyer: user.email, company: "" });
  // Defaults so every type opens on something valid for this user.
  if (p.type === "company" && !options.companies.some((c) => c.id === p.company)) p.company = options.companies[0]?.id ?? "";
  const buyers = isBuyer ? [{ id: user.email, name: user.name }] : options.buyers;
  if (p.type === "buyer" && !buyers.some((b) => b.id === p.buyer)) p.buyer = buyers[0]?.id ?? "";
  const types: ReportType[] = isBuyer ? ["buyer"] : ["consolidated", "company", "buyer"];
  const canShare = hasPermission(user, "report:share");
  const [report, links, names] = await Promise.all([buildReport(user, p, locale), canShare ? listLinks(user) : Promise.resolve([]), userNameMap()]);
  const query = reportQuery(p);

  return (
    <>
      <PageHeader title={t("nav.reports")} description={t("reports.intro")} actions={<ExportBar query={query} canShare={canShare} />} />
      <div className="space-y-6">
        <ReportBuilder p={p} companies={options.companies} buyers={buyers} types={types} />
        <div className="rounded-2xl border bg-background p-3 shadow-soft sm:p-5 print:border-0 print:p-0 print:shadow-none">
          <ReportDocument r={report} />
        </div>
        {canShare && (
          <Panel title={t("reports.activeLinks")} className="print:hidden">
            <ShareLinksList links={links.map((l) => ({ id: l.id, type: l.report_type, params: l.params, expires: l.expires_at, created: l.created_at, by: names[l.created_by] ?? l.created_by }))} />
          </Panel>
        )}
      </div>
    </>
  );
}
