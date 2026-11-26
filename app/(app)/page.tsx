import { redirect } from "next/navigation";
import { CheckCircle2, Database, ShieldCheck, XCircle } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission, homeFor } from "@/lib/auth/permissions";
import { requirePage } from "@/lib/auth/session";
import { getBackend, getAll, TABLE_NAMES, dataBackendKind } from "@/lib/sheets";
import { formatNumber } from "@/lib/format";

async function systemStatus() {
  try {
    const backend = await getBackend();
    const tabs = await backend.listTabs();
    const missing = TABLE_NAMES.filter((t) => !tabs.includes(t));
    const companies = missing.includes("Companies") ? 0 : (await getAll("Companies")).length;
    return { ok: true as const, ready: TABLE_NAMES.length - missing.length, missing, companies };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export default async function DashboardPage() {
  const user = await requirePage();
  if (!hasPermission(user, "dashboard:view")) redirect(homeFor(user.role));
  const [t, locale, status] = await Promise.all([getTranslations(), getLocale(), systemStatus()]);
  const kind = dataBackendKind();

  return (
    <>
      <PageHeader title={t("dashboard.welcome", { name: user.name })} description={t("dashboard.intro")} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2"><Database className="size-4" />{t("dashboard.backend")}</CardDescription>
            <CardTitle className="text-xl">{kind === "google" ? t("dashboard.backendGoogle") : t("dashboard.backendMemory")}</CardTitle>
          </CardHeader>
          <CardContent>
            {status.ok ? (
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  {status.missing.length ? <XCircle className="size-4 text-warning" /> : <CheckCircle2 className="size-4 text-success" />}
                  {t("dashboard.tabs")}: <span className="num font-semibold">{formatNumber(status.ready, locale)} / {formatNumber(TABLE_NAMES.length, locale)}</span>
                </p>
                {status.missing.length > 0 && <p className="text-warning">{t("dashboard.tabsMissing")}</p>}
              </div>
            ) : (
              <p className="flex items-start gap-2 text-sm text-destructive"><XCircle className="mt-0.5 size-4 shrink-0" />{t("dashboard.error")}: {status.error}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2"><ShieldCheck className="size-4" />{t("dashboard.role")}</CardDescription>
            <CardTitle className="text-xl">{t(`roles.${user.role}`)}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {t("dashboard.companies")}:
            {user.role === "Admin" || user.role === "Manager" || user.company_ids.includes("*") ? (
              <Badge variant="accent">{t("dashboard.allCompanies")}</Badge>
            ) : (
              <span className="num">{formatNumber(user.company_ids.length, locale)}</span>
            )}
          </CardContent>
        </Card>
        <Card className="overflow-hidden md:col-span-2 xl:col-span-1">
          <div className="h-full bg-gradient-to-br from-brand-primary to-brand-secondary p-5 text-white">
            <p className="text-sm text-white/70">{t("app.team")}</p>
            <p className="mt-1 text-xl font-semibold">{t("app.name")}</p>
            <div className="mt-6 h-1 w-16 rounded-full bg-brand-accent" />
          </div>
        </Card>
      </div>
    </>
  );
}
