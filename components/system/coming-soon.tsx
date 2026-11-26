import { Hammer } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePage } from "@/lib/auth/session";
import { NAV, type NavKey } from "@/lib/nav";

export async function ComingSoon({ navKey }: { navKey: NavKey }) {
  const item = NAV.find((n) => n.key === navKey)!;
  await requirePage(item.permission);
  const t = await getTranslations();
  const section = t(`nav.${navKey}`);
  return (
    <>
      <PageHeader title={section} />
      <EmptyState icon={Hammer} title={t("soon.title", { section })} body={t("soon.body", { phase: t("common.phase", { n: item.phase }) })} />
    </>
  );
}
