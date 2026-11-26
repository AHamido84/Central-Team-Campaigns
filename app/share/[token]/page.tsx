import type { Metadata } from "next";
import { Link2Off } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { PrintButton } from "@/components/reports/print-button";
import { ReportDocument } from "@/components/reports/report-document";
import { EmptyState } from "@/components/ui/empty-state";
import { buildReport } from "@/lib/data/reports";
import { resolveLink } from "@/lib/reports/share";

export const metadata: Metadata = { robots: { index: false, follow: false }, title: "Report" };

/** Public, read-only report behind an expiring token. Shows only what the link's creator may see. */
export default async function SharedReport({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ print?: string }> }) {
  const [{ token }, sp, t, locale] = await Promise.all([params, searchParams, getTranslations(), getLocale()]);
  const resolved = await resolveLink(token);
  if (!resolved)
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg items-center px-4">
        <EmptyState icon={Link2Off} title={t("reports.linkInvalid")} body={t("reports.linkInvalidBody")} />
      </main>
    );
  let report;
  try {
    report = await buildReport(resolved.owner, resolved.params, locale);
  } catch {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg items-center px-4">
        <EmptyState icon={Link2Off} title={t("reports.linkInvalid")} body={t("reports.linkNoAccess")} />
      </main>
    );
  }
  const print = sp.print === "1";
  return (
    <main className={print ? "report-print mx-auto max-w-[1100px] p-0" : "mx-auto max-w-[1100px] px-4 py-6 sm:px-6"}>
      {!print && (
        <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
          <p className="text-xs text-muted-foreground">
            {t("reports.sharedBy", { name: resolved.owner.name })} · {t("reports.expires")} <span className="num" dir="ltr">{resolved.link.expires_at.slice(0, 10)}</span>
          </p>
          <PrintButton />
        </div>
      )}
      <ReportDocument r={report} />
    </main>
  );
}
