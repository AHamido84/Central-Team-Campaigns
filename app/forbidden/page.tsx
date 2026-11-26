import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default async function Forbidden() {
  const t = await getTranslations();
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <EmptyState
        className="w-full max-w-lg"
        icon={ShieldAlert}
        title={t("forbidden.title")}
        body={t("forbidden.body")}
        action={<Button asChild><Link href="/">{t("common.home")}</Link></Button>}
      />
    </main>
  );
}
