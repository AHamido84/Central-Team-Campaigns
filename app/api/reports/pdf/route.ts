import { NextResponse, type NextRequest } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { ForbiddenError } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { assertCanRunReport } from "@/lib/data/reports";
import { parseReportParams } from "@/lib/reports/params";
import { renderPdf } from "@/lib/reports/pdf";
import { createLink, revokeLink, TEMP_PDF_TYPE } from "@/lib/reports/share";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Prints the report to PDF with headless Chrome. Chrome opens a 5-minute,
 * single-use share link to the report (so it needs no session), then the link is revoked.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const p = parseReportParams(Object.fromEntries(req.nextUrl.searchParams));
  try {
    assertCanRunReport(user, p);
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw e;
  }
  const [locale, t] = await Promise.all([getLocale(), getTranslations()]);
  const link = await createLink(user, p, { minutes: 5, fixedDates: true, kind: TEMP_PDF_TYPE });
  const origin = process.env.APP_URL?.replace(/\/$/, "") || req.nextUrl.origin;
  try {
    const pdf = await renderPdf(`${origin}/share/${link.token}?print=1`, { left: `${t("app.org")} · ${t("app.team")}`, right: t("reports.confidential") }, locale);
    const name = `qaswarah-report-${p.type}-${p.from}_${p.to}.pdf`;
    return new NextResponse(Buffer.from(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("PDF failed", e);
    return NextResponse.json({ error: (e as Error).message === "chromeNotFound" ? "chromeNotFound" : "pdfFailed" }, { status: 500 });
  } finally {
    await revokeLink(link.id, user.email);
  }
}
