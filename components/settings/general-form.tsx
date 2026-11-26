"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { saveSettings } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAction } from "@/components/forms/use-action";

export interface GeneralValues {
  default_currency: string;
  alert_frequency_max: string;
  alert_ctr_min: string; // percent
  alert_cpl_over_target_pct: string; // percent
  alert_zero_results_days: string;
  alert_no_import_days: string;
}

const NUMERIC: { key: Exclude<keyof GeneralValues, "default_currency">; unit: "x" | "%" | "days"; step: string }[] = [
  { key: "alert_frequency_max", unit: "x", step: "0.1" },
  { key: "alert_ctr_min", unit: "%", step: "0.01" },
  { key: "alert_cpl_over_target_pct", unit: "%", step: "1" },
  { key: "alert_zero_results_days", unit: "days", step: "1" },
  { key: "alert_no_import_days", unit: "days", step: "1" },
];

export function GeneralSettingsForm({ initial }: { initial: GeneralValues }) {
  const t = useTranslations();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { pending, run, errorText } = useAction();
  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        setErrors({});
        run(() => saveSettings(v), { setError: (k, m) => setErrors((x) => ({ ...x, [k as string]: m.message ?? "" })) });
      }}
    >
      <Card className="space-y-4 p-5">
        <div>
          <h3 className="font-semibold">{t("settings.general.currencyTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("settings.general.currencyBody")}</p>
        </div>
        <Field label={t("settings.general.default_currency")} htmlFor="s_cur" error={errorText(errors.default_currency)} className="max-w-xs">
          <Input id="s_cur" dir="ltr" maxLength={3} className="uppercase" value={v.default_currency} onChange={(e) => setV({ ...v, default_currency: e.target.value })} />
        </Field>
      </Card>
      <Card className="space-y-4 p-5">
        <div>
          <h3 className="font-semibold">{t("settings.general.alertsTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("settings.general.alertsBody")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {NUMERIC.map(({ key, unit, step }) => (
            <Field key={key} label={t(`settings.general.${key}`)} htmlFor={key} error={errorText(errors[key])} hint={t(`settings.general.hint.${key}`)}>
              <div className="relative">
                <Input id={key} type="number" inputMode="decimal" step={step} dir="ltr" className="num pe-14" value={v[key]} onChange={(e) => setV({ ...v, [key]: e.target.value })} />
                <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{t(`settings.general.unit.${unit}`)}</span>
              </div>
            </Field>
          ))}
        </div>
      </Card>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>{pending ? t("common.saving") : t("common.save")}</Button>
      </div>
    </form>
  );
}
