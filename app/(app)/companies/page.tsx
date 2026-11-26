import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CompanyCard } from "@/components/companies/company-card";
import { CompanyFormDialog } from "@/components/companies/company-form-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { can } from "@/lib/auth/permissions";
import { requirePage } from "@/lib/auth/session";
import { companyCards } from "@/lib/data/companies";

export const metadata = { title: "Companies" };

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const user = await requirePage("company:view");
  const { archived } = await searchParams;
  const showArchived = archived === "1";
  const [t, cards] = await Promise.all([getTranslations(), companyCards(user, showArchived)]);
  const canManage = can(user, "company:manage");

  const addButton = canManage ? (
    <CompanyFormDialog
      trigger={
        <Button>
          <Plus />
          {t("companies.add")}
        </Button>
      }
    />
  ) : null;

  return (
    <>
      <PageHeader
        title={t("nav.companies")}
        description={t("companies.subtitle")}
        actions={
          <>
            <Button variant="ghost" asChild>
              <Link href={showArchived ? "/companies" : "/companies?archived=1"}>{showArchived ? t("companies.hideArchived") : t("companies.showArchived")}</Link>
            </Button>
            {addButton}
          </>
        }
      />
      {cards.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={t("companies.emptyTitle")}
          body={canManage ? t("companies.emptyBody") : t("companies.emptyScoped")}
          action={addButton}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => (
            <CompanyCard key={c.company.id} data={c} />
          ))}
        </div>
      )}
    </>
  );
}
