import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

export const COMPANY_TABS = ["overview", "campaigns", "creatives", "schedule", "budgets", "accounts", "reports"] as const;
export type CompanyTab = (typeof COMPANY_TABS)[number];

/** Link-based tabs so each tab has its own URL (?tab=campaigns) and can be shared. */
export async function CompanyTabs({ companyId, active }: { companyId: string; active: CompanyTab }) {
  const t = await getTranslations("companies.tabs");
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <nav className="inline-flex min-w-max items-center gap-1 rounded-xl bg-muted p-1">
        {COMPANY_TABS.map((tab) => (
          <Link
            key={tab}
            href={`/companies/${companyId}${tab === "overview" ? "" : `?tab=${tab}`}`}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors",
              tab === active ? "bg-card font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(tab)}
          </Link>
        ))}
      </nav>
    </div>
  );
}
