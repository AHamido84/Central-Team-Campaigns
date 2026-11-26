import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import type { Permission } from "@/lib/auth/permissions";

export const COMPANY_TABS = ["overview", "campaigns", "creatives", "schedule", "budgets", "accounts", "reports"] as const;
export type CompanyTab = (typeof COMPANY_TABS)[number];

/** Each tab is shown only to roles that may see that section. */
export const TAB_PERMISSION: Record<CompanyTab, Permission> = {
  overview: "dashboard:view",
  campaigns: "campaign:view",
  creatives: "creative:view",
  schedule: "schedule:view",
  budgets: "budget:view",
  accounts: "campaign:view",
  reports: "report:view",
};

/** Link-based tabs so each tab has its own URL (?tab=campaigns) and can be shared. */
export async function CompanyTabs({ companyId, active, tabs }: { companyId: string; active: CompanyTab; tabs: readonly CompanyTab[] }) {
  const t = await getTranslations("companies.tabs");
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <nav className="inline-flex min-w-max items-center gap-1 rounded-xl bg-muted p-1">
        {tabs.map((tab, i) => (
          <Link
            key={tab}
            href={`/companies/${companyId}${i === 0 ? "" : `?tab=${tab}`}`}
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
