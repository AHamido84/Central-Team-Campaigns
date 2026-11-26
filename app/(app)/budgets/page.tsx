import { getTranslations } from "next-intl/server";
import { BudgetsSection } from "@/components/budgets/budgets-section";
import { PageHeader } from "@/components/layout/page-header";
import { requirePage } from "@/lib/auth/session";
import type { SearchParams } from "@/lib/filters";

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requirePage("budget:view");
  const [t, sp] = await Promise.all([getTranslations(), searchParams]);
  return (
    <>
      <PageHeader title={t("nav.budgets")} description={t("budgets.intro")} />
      <BudgetsSection user={user} sp={sp} />
    </>
  );
}
