import Link from "next/link";
import { Megaphone } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { CompanyCardData } from "@/lib/data/companies";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { CompanyLogo } from "./company-logo";

export async function CompanyCard({ data }: { data: CompanyCardData }) {
  const [t, locale] = await Promise.all([getTranslations("companies"), getLocale()]);
  const { company, mtdSpend, budget, activeCampaigns } = data;
  const ratio = budget > 0 ? mtdSpend / budget : null;
  const over = ratio !== null && ratio > 1;
  const name = locale === "en" && company.name_en ? company.name_en : company.name_ar;
  const sub = locale === "en" ? company.name_ar : company.name_en;

  return (
    <Link href={`/companies/${company.id}`} className="group rounded-xl outline-none ring-ring focus-visible:ring-2">
      <Card className={cn("h-full p-5 transition-all group-hover:-translate-y-0.5 group-hover:shadow-md", company.status === "archived" && "opacity-70")}>
        <div className="flex items-start gap-4">
          <CompanyLogo name={company.name_ar} url={company.logo_url} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate font-semibold">{name}</h3>
              <StatusBadge status={company.status} />
            </div>
            <p className="truncate text-sm text-muted-foreground">{sub || company.industry || "—"}</p>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs text-muted-foreground">{t("mtdSpend")}</p>
            {ratio !== null && <p className={cn("num text-xs font-medium", over ? "text-destructive" : "text-muted-foreground")}>{formatPercent(ratio, locale)}</p>}
          </div>
          <p className="num mt-1 text-xl font-semibold">{formatCurrency(mtdSpend, company.currency || "SAR", locale, 0)}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full transition-all", over ? "bg-destructive" : "bg-brand-accent")} style={{ width: `${Math.min(100, (ratio ?? 0) * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {budget > 0 ? t("ofBudget", { budget: formatCurrency(budget, company.currency || "SAR", locale, 0) }) : t("noBudget")}
            {over && <span className="ms-2 font-medium text-destructive">· {t("overBudget")}</span>}
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t pt-4 text-sm text-muted-foreground">
          <Megaphone className="size-4" />
          {t("activeCampaigns")}: <span className="num font-semibold text-foreground">{formatNumber(activeCampaigns, locale)}</span>
        </div>
      </Card>
    </Link>
  );
}
