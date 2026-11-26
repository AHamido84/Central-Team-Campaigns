"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import type { z } from "zod";
import { saveManualResult } from "@/lib/actions/import";
import { todayISO } from "@/lib/dates";
import { ManualResultInput } from "@/types/forms-results";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAction } from "@/components/forms/use-action";

type In = z.input<typeof ManualResultInput>;
type Out = z.output<typeof ManualResultInput>;

export interface ManualOptions {
  companies: { id: string; name: string }[];
  platforms: { id: string; name: string }[];
  campaigns: { id: string; name: string; company_id: string; platform_id: string }[];
  adSets: { id: string; name: string; campaign_id: string }[];
}

const NUM_GROUPS: { title: "core" | "conversions" | "video"; fields: (keyof Out)[] }[] = [
  { title: "core", fields: ["spend", "impressions", "reach", "clicks", "link_clicks", "results"] },
  { title: "conversions", fields: ["leads", "messages", "purchases", "purchase_value"] },
  { title: "video", fields: ["video_views", "video_3s_views", "thruplay", "engagement"] },
];

export function ManualEntryForm({ options }: { options: ManualOptions }) {
  const t = useTranslations("import");
  const tc = useTranslations("common");
  const { pending, run, errorText } = useAction();
  const form = useForm<In, unknown, Out>({
    resolver: zodResolver(ManualResultInput),
    defaultValues: {
      date: todayISO(),
      company_id: options.companies.length === 1 ? options.companies[0].id : "",
      platform_id: options.platforms[0]?.id ?? "",
      campaign_id: "",
      adset_id: "",
      ad_name: "",
      result_type: "",
    },
  });
  const e = form.formState.errors;
  const [companyId, platformId, campaignId] = form.watch(["company_id", "platform_id", "campaign_id"]);
  const campaigns = options.campaigns.filter((c) => c.company_id === companyId && c.platform_id === platformId);
  const adSets = options.adSets.filter((a) => a.campaign_id === campaignId);

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={form.handleSubmit((d) =>
        run(() => saveManualResult(d), {
          setError: form.setError,
          success: false,
          onSuccess: (res) => {
            import("sonner").then(({ toast }) => toast.success(res.updated ? t("manual.savedUpdate") : t("manual.savedNew")));
            const keep = form.getValues();
            form.reset({ date: keep.date, company_id: keep.company_id, platform_id: keep.platform_id, campaign_id: keep.campaign_id, adset_id: "", ad_name: "", result_type: keep.result_type });
          },
        }),
      )}
    >
      <Card>
        <CardHeader>
          <CardTitle>{t("manual.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("manual.body")}</p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t("fields.date")} htmlFor="m_date" required error={errorText(e.date?.message)}>
            <Input id="m_date" type="date" dir="ltr" className="num" {...form.register("date")} />
          </Field>
          <Field label={t("company")} htmlFor="m_company" required error={errorText(e.company_id?.message)}>
            <Select id="m_company" {...form.register("company_id", { onChange: () => form.setValue("campaign_id", "") })}>
              <option value="">—</option>
              {options.companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("platform")} htmlFor="m_platform" required>
            <Select id="m_platform" {...form.register("platform_id", { onChange: () => form.setValue("campaign_id", "") })}>
              {options.platforms.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("fields.campaign_name")} htmlFor="m_campaign" required error={errorText(e.campaign_id?.message)}>
            <Select id="m_campaign" {...form.register("campaign_id", { onChange: () => form.setValue("adset_id", "") })}>
              <option value="">—</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("manual.adset")} htmlFor="m_adset" error={errorText(e.adset_id?.message)}>
            <Select id="m_adset" {...form.register("adset_id")}>
              <option value="">—</option>
              {adSets.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("manual.adName")} htmlFor="m_ad">
            <Input id="m_ad" {...form.register("ad_name")} />
          </Field>
        </CardContent>
      </Card>
      {NUM_GROUPS.map((g) => (
        <Card key={g.title}>
          <CardHeader>
            <CardTitle className="text-sm">{t(`manual.${g.title}`)}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {g.fields.map((f) => (
              <Field key={f} label={t(`fields.${f}`)} htmlFor={`m_${f}`} error={errorText(e[f]?.message)}>
                <Input id={`m_${f}`} type="number" min={0} step="any" inputMode="decimal" dir="ltr" className="num" placeholder="0" {...form.register(f)} />
              </Field>
            ))}
            {g.title === "core" && (
              <Field label={t("fields.result_type")} htmlFor="m_rt" className="col-span-2 md:col-span-3 lg:col-span-2">
                <Input id="m_rt" dir="ltr" placeholder="leads / messages / purchases" {...form.register("result_type")} />
              </Field>
            )}
          </CardContent>
        </Card>
      ))}
      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending}>{pending ? tc("saving") : t("manual.save")}</Button>
      </div>
    </form>
  );
}
