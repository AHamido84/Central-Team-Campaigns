import Link from "next/link";
import { ChevronLeft, Layers, Settings2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { requirePage } from "@/lib/auth/session";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requirePage("settings:manage");
  const t = await getTranslations();
  return (
    <>
      <PageHeader title={t("nav.settings")} description={t("settings.subtitle")} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Link href="/settings/platforms" className="group rounded-xl outline-none ring-ring focus-visible:ring-2">
          <Card className="flex items-center gap-4 p-5 transition-shadow group-hover:shadow-md">
            <div className="grid size-11 place-items-center rounded-xl bg-brand-accent/15 text-brand-primary dark:text-brand-accent"><Layers className="size-5" /></div>
            <div className="flex-1">
              <p className="font-semibold">{t("settings.platforms")}</p>
              <p className="text-sm text-muted-foreground">{t("settings.platformsBody")}</p>
            </div>
            <ChevronLeft className="size-4 text-muted-foreground ltr:rotate-180" />
          </Card>
        </Link>
        <Card className="flex items-center gap-4 border-dashed p-5 opacity-70 shadow-none">
          <div className="grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground"><Settings2 className="size-5" /></div>
          <div>
            <p className="font-semibold">{t("settings.more")}</p>
            <p className="text-sm text-muted-foreground">{t("settings.moreBody")}</p>
          </div>
        </Card>
      </div>
    </>
  );
}
