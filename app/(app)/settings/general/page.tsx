import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { GeneralSettingsForm } from "@/components/settings/general-form";
import { requirePage } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";

/** Fractions are shown as percents so people type 0.8 for 0.8%. */
const pct = (v: string) => String(+(Number(v) * 100).toFixed(4));

export default async function GeneralSettingsPage() {
  await requirePage("settings:manage");
  const [t, s] = await Promise.all([getTranslations(), getSettings()]);
  return (
    <>
      <PageHeader title={t("settings.general.title")} description={t("settings.general.subtitle")} />
      <GeneralSettingsForm initial={{ ...s, alert_ctr_min: pct(s.alert_ctr_min), alert_cpl_over_target_pct: pct(s.alert_cpl_over_target_pct) }} />
    </>
  );
}
