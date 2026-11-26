"use client";
import { useLocale, useTranslations } from "next-intl";
import { Link2, Trash2 } from "lucide-react";
import { revokeShareLinkAction } from "@/lib/actions/reports";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/forms/use-action";

export function ShareLinksList({ links }: { links: { id: string; type: string; params: string; expires: string; created: string; by: string }[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const { pending, run } = useAction();
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { dateStyle: "medium" });
  if (!links.length) return <p className="text-sm text-muted-foreground">{t("reports.noLinks")}</p>;
  return (
    <ul className="divide-y">
      {links.map((l) => {
        const q = new URLSearchParams(l.params);
        return (
          <li key={l.id} className="flex items-center gap-3 py-2 text-sm">
            <Link2 className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate">{t(`reports.type.${l.type}`)} · <span className="num" dir="ltr">{q.get("range") === "custom" ? `${q.get("from")} → ${q.get("to")}` : t(`filters.preset.${q.get("range") ?? "last_30"}`)}</span></p>
              <p className="text-xs text-muted-foreground">{l.by} · {t("reports.expires")} {fmt.format(new Date(l.expires))}</p>
            </div>
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => revokeShareLinkAction(l.id), { success: t("reports.revoked") })} aria-label={t("reports.revoke")}>
              <Trash2 className="text-destructive" />
              <span className="hidden sm:inline">{t("reports.revoke")}</span>
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
