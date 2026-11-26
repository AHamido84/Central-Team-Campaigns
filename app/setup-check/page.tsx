import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { Logo } from "@/components/layout/logo";
import { runSetupCheck, type CheckState } from "@/lib/setup-check";

export const dynamic = "force-dynamic";
export const metadata = { title: "Setup check", robots: { index: false, follow: false } };

const ICON: Record<CheckState, React.ReactNode> = {
  ok: <CheckCircle2 className="size-5 shrink-0 text-success" />,
  warn: <AlertTriangle className="size-5 shrink-0 text-warning" />,
  fail: <XCircle className="size-5 shrink-0 text-destructive" />,
};

/** Public page that says which server setting is missing, without showing any secret. */
export default async function SetupCheckPage() {
  const [t, r] = await Promise.all([getTranslations("setup"), runSetupCheck()]);
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6 sm:p-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Logo size={36} /><h1 className="text-xl font-semibold">{t("title")}</h1></div>
        <LocaleToggle />
      </div>
      <p className={r.ok ? "rounded-lg bg-success/10 p-4 text-sm text-success" : "rounded-lg bg-destructive/10 p-4 text-sm text-destructive"}>
        {r.ok ? t("allGood") : t("needsFix")}
      </p>
      <ul className="divide-y rounded-xl border bg-card">
        {r.checks.map((c) => (
          <li key={c.key} className="flex gap-3 p-4">
            {ICON[c.state]}
            <div className="min-w-0 space-y-1 text-sm">
              <p className="font-medium">{t(`check.${c.key}.title`)}</p>
              {c.state !== "ok" && (
                <p className="leading-6 text-muted-foreground">
                  {c.key === "sheetAccess" && c.detail ? t(`reason.${c.detail}`, { email: r.serviceEmail || "—" }) : c.key === "tabs" ? t("check.tabs.fix", { tabs: c.detail ?? "" }) : t(`check.${c.key}.fix`)}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs leading-6 text-muted-foreground">{t("redeploy")}</p>
      <a href="/login" className="inline-block text-sm font-medium underline">{t("back")}</a>
    </main>
  );
}
