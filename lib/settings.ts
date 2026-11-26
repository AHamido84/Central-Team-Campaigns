import "server-only";
import { getAll } from "@/lib/sheets";

export const SETTING_DEFAULTS = {
  default_currency: "SAR",
  alert_frequency_max: "3",
  alert_ctr_min: "0.008",
  alert_cpl_over_target_pct: "0.2",
  alert_zero_results_days: "3",
  alert_no_import_days: "2",
};
export type SettingKey = keyof typeof SETTING_DEFAULTS;

export async function getSettings(): Promise<Record<SettingKey, string>> {
  const rows = await getAll("Settings");
  const out = { ...SETTING_DEFAULTS };
  for (const r of rows) if (r.key in out) out[r.key as SettingKey] = r.value;
  return out;
}

export async function alertThresholds() {
  const s = await getSettings();
  const num = (k: SettingKey) => {
    const n = Number(s[k]);
    return Number.isFinite(n) ? n : Number(SETTING_DEFAULTS[k]);
  };
  return {
    frequencyMax: num("alert_frequency_max"),
    ctrMin: num("alert_ctr_min"),
    cplOverTargetPct: num("alert_cpl_over_target_pct"),
    zeroResultsDays: num("alert_zero_results_days"),
    noImportDays: num("alert_no_import_days"),
    currency: s.default_currency,
  };
}
export type Thresholds = Awaited<ReturnType<typeof alertThresholds>>;
