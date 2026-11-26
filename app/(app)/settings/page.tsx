import Link from "next/link";
import { ChevronLeft, FileSpreadsheet, Layers, SlidersHorizontal, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { requirePage } from "@/lib/auth/session";
import { dataBackendKind } from "@/lib/sheets";

export const metadata = { title: "Settings" };

const CARDS = [
  { href: "/settings/users", key: "users", icon: Users },
  { href: "/settings/general", key: "general", icon: SlidersHorizontal },
  { href: "/settings/platforms", key: "platforms", icon: Layers },
  { href: "/settings/mappings", key: "mappings", icon: FileSpreadsheet },
] as const;

export default async function SettingsPage() {
  await requirePage("settings:manage");
  const t = await getTranslations();
  const backend = dataBackendKind();
  return (
    <>
      <PageHeader title={t("nav.settings")} description={t("settings.subtitle")} />
      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map(({ href, key, icon: Icon }) => (
          <Link key={key} href={href} className="group rounded-xl outline-none ring-ring focus-visible:ring-2">
            <Card className="flex h-full items-center gap-4 p-5 transition-shadow group-hover:shadow-md">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-accent/15 text-brand-primary dark:text-brand-accent"><Icon className="size-5" /></div>
              <div className="flex-1">
                <p className="font-semibold">{t(`settings.cards.${key}.title`)}</p>
                <p className="text-sm text-muted-foreground">{t(`settings.cards.${key}.body`)}</p>
              </div>
              <ChevronLeft className="size-4 text-muted-foreground ltr:rotate-180" />
            </Card>
          </Link>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        {t("settings.backend")} <span className="num rounded bg-muted px-1.5 py-0.5" dir="ltr">{backend === "google" ? "Google Sheets" : t("settings.backendMemory")}</span>
      </p>
    </>
  );
}
