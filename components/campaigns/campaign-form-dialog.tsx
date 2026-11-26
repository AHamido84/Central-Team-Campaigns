"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import type { z } from "zod";
import { saveCampaign } from "@/lib/actions/campaigns";
import { CampaignInput } from "@/types/forms";
import { BUDGET_TYPES, CAMPAIGN_OBJECTIVES, CAMPAIGN_STATUS, type AdAccount, type Campaign } from "@/types/entities";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/components/forms/use-action";

type In = z.input<typeof CampaignInput>;
type Out = z.output<typeof CampaignInput>;

export interface CampaignFormOptions {
  companies: { id: string; name: string }[];
  platforms: { id: string; name: string }[];
  adAccounts: Pick<AdAccount, "id" | "company_id" | "platform_id" | "account_name">[];
  mediaBuyers: { email: string; name: string }[];
}

export function CampaignFormDialog({
  campaign,
  options,
  fixedCompanyId,
  trigger,
  defaultBuyer,
}: {
  campaign?: Campaign;
  options: CampaignFormOptions;
  fixedCompanyId?: string;
  trigger: React.ReactNode;
  defaultBuyer?: string;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations();
  const { pending, run, errorText } = useAction();
  const form = useForm<In, unknown, Out>({
    resolver: zodResolver(CampaignInput),
    defaultValues: campaign ?? {
      company_id: fixedCompanyId ?? "",
      platform_id: options.platforms.find((p) => p.name === "Meta")?.id ?? options.platforms[0]?.id ?? "",
      ad_account_id: "",
      name: "",
      objective: "Leads",
      start_date: "",
      end_date: "",
      budget_type: "daily",
      budget: 0,
      status: "planned",
      media_buyer: defaultBuyer ?? "",
      external_campaign_id: "",
      notes: "",
    },
  });
  const e = form.formState.errors;
  const companyId = form.watch("company_id");
  const platformId = form.watch("platform_id");
  const accounts = options.adAccounts.filter((a) => a.company_id === companyId && a.platform_id === platformId);
  const f = (k: keyof Out) => t(`campaigns.f.${k}`);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{campaign ? t("campaigns.edit") : t("campaigns.add")}</DialogTitle>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={form.handleSubmit((d) =>
            run(() => saveCampaign(campaign?.id ?? null, d), {
              setError: form.setError,
              onSuccess: () => {
                setOpen(false);
                if (!campaign) form.reset();
              },
            }),
          )}
        >
          <Field label={f("name")} htmlFor="name" required error={errorText(e.name?.message)} className="sm:col-span-2">
            <Input id="name" {...form.register("name")} />
          </Field>
          <Field label={f("company_id")} htmlFor="company_id" required error={errorText(e.company_id?.message)}>
            {fixedCompanyId ? (
              <>
                {/* Disabled inputs are dropped by react-hook-form, so show a read-only copy and keep a hidden field. */}
                <Select id="company_id" disabled value={fixedCompanyId} onChange={() => {}}>
                  {options.companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
                <input type="hidden" {...form.register("company_id")} />
              </>
            ) : (
              <Select id="company_id" {...form.register("company_id")}>
                <option value="">—</option>
                {options.companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={f("platform_id")} htmlFor="platform_id" required error={errorText(e.platform_id?.message)}>
            <Select id="platform_id" {...form.register("platform_id")}>
              {options.platforms.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
          <Field label={f("ad_account_id")} htmlFor="ad_account_id" error={errorText(e.ad_account_id?.message)}>
            <Select id="ad_account_id" disabled={!companyId} {...form.register("ad_account_id")}>
              <option value="">{companyId ? t("campaigns.noAccount") : t("campaigns.selectCompanyFirst")}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.account_name}</option>
              ))}
            </Select>
          </Field>
          <Field label={f("objective")} htmlFor="objective">
            <Select id="objective" {...form.register("objective")}>
              {CAMPAIGN_OBJECTIVES.map((o) => (
                <option key={o} value={o}>{t(`campaigns.objective.${o}`)}</option>
              ))}
            </Select>
          </Field>
          <Field label={f("start_date")} htmlFor="start_date" error={errorText(e.start_date?.message)}>
            <Input id="start_date" type="date" dir="ltr" className="num" {...form.register("start_date")} />
          </Field>
          <Field label={f("end_date")} htmlFor="end_date" error={errorText(e.end_date?.message)}>
            <Input id="end_date" type="date" dir="ltr" className="num" {...form.register("end_date")} />
          </Field>
          <Field label={f("budget_type")} htmlFor="budget_type">
            <Select id="budget_type" {...form.register("budget_type")}>
              {BUDGET_TYPES.map((b) => (
                <option key={b} value={b}>{t(`campaigns.budgetType.${b}`)}</option>
              ))}
            </Select>
          </Field>
          <Field label={f("budget")} htmlFor="budget" error={errorText(e.budget?.message)}>
            <Input id="budget" type="number" min={0} step="any" inputMode="decimal" dir="ltr" className="num" {...form.register("budget")} />
          </Field>
          <Field label={f("status")} htmlFor="status">
            <Select id="status" {...form.register("status")}>
              {CAMPAIGN_STATUS.map((s) => (
                <option key={s} value={s}>{t(`status.${s}`)}</option>
              ))}
            </Select>
          </Field>
          <Field label={f("media_buyer")} htmlFor="media_buyer">
            <Select id="media_buyer" {...form.register("media_buyer")}>
              <option value="">—</option>
              {options.mediaBuyers.map((m) => (
                <option key={m.email} value={m.email}>{m.name}</option>
              ))}
            </Select>
          </Field>
          <Field label={f("external_campaign_id")} htmlFor="external_campaign_id" className="sm:col-span-2">
            <Input id="external_campaign_id" dir="ltr" className="num" {...form.register("external_campaign_id")} />
          </Field>
          <Field label={f("notes")} htmlFor="notes" className="sm:col-span-2">
            <Textarea id="notes" rows={2} {...form.register("notes")} />
          </Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={pending}>{pending ? t("common.saving") : t("common.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
