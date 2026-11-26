import Link from "next/link";
import { SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default async function NotFound() {
  const t = await getTranslations();
  return (
    <main className="grid min-h-[70dvh] place-items-center p-6">
      <EmptyState className="w-full max-w-lg" icon={SearchX} title={t("errors.notFound")} action={<Button asChild><Link href="/">{t("common.home")}</Link></Button>} />
    </main>
  );
}
