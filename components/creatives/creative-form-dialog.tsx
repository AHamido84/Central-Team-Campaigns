"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { z } from "zod";
import { saveCreative } from "@/lib/actions/creatives";
import { CreativeInput } from "@/types/forms";
import { ASPECT_RATIOS, CREATIVE_STATUS, CREATIVE_TYPES, type Creative } from "@/types/entities";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/components/forms/use-action";

type In = z.input<typeof CreativeInput>;
type Out = z.output<typeof CreativeInput>;

export interface CreativeFormOptions {
  companies: { id: string; name: string }[];
  campaigns: { id: string; name: string; company_id: string }[];
  designers: string[];
  canApprove: boolean;
}

export function CreativeFormDialog({ creative, options, trigger, fixedCompanyId, defaultDesigner }: { creative?: Creative; options: CreativeFormOptions; trigger: React.ReactNode; fixedCompanyId?: string; defaultDesigner?: string }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations();
  const router = useRouter();
  const { pending, run, errorText } = useAction();
  const form = useForm<In, unknown, Out>({
    resolver: zodResolver(CreativeInput),
    defaultValues: creative
      ? { ...creative, tags: creative.tags.join(", ") }
      : { company_id: fixedCompanyId ?? (options.companies.length === 1 ? options.companies[0].id : ""), campaign_id: "", title: "", type: "image", aspect_ratio: "1:1", file_url: "", thumbnail_url: "", primary_text: "", headline: "", cta: "", designer: defaultDesigner ?? "", copywriter: "", status: "idea", tags: "", external_ad_id: "" },
  });
  const e = form.formState.errors;
  const companyId = form.watch("company_id");
  const campaigns = options.campaigns.filter((c) => c.company_id === companyId);
  const f = (k: keyof Out) => t(`creatives.f.${k}`);
  // Approval goes through review; only approvers see "approved" here. Live / paused need an approved creative.
  const statuses = CREATIVE_STATUS.filter((s) => (s !== "approved" || options.canApprove || creative?.status === "approved") && ((s !== "live" && s !== "paused") || !!creative?.approved_by || creative?.status === s));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{creative ? t("creatives.edit") : t("creatives.add")}</DialogTitle>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={form.handleSubmit((d) =>
            run(() => saveCreative(creative?.id ?? null, d), {
              setError: form.setError,
              success: false,
              onSuccess: (res) => {
                setOpen(false);
                toast.success(res.linked ? t("creatives.savedLinked", { n: res.linked }) : t("common.saved"));
                if (!creative) router.push(`/creatives/${res.creative.id}`);
              },
            }),
          )}
        >
          <Field label={f("title")} htmlFor="title" required error={errorText(e.title?.message)} hint={t("creatives.titleHint")} className="sm:col-span-2">
            <Input id="title" {...form.register("title")} />
          </Field>
          <Field label={f("company_id")} htmlFor="company_id" required error={errorText(e.company_id?.message)}>
            {fixedCompanyId ? (
              <>
                <Select id="company_id" disabled value={fixedCompanyId} onChange={() => {}}>
                  {options.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                <input type="hidden" {...form.register("company_id")} />
              </>
            ) : (
              <Select id="company_id" {...form.register("company_id")}>
                <option value="">—</option>
                {options.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
          </Field>
          <Field label={f("campaign_id")} htmlFor="campaign_id" error={errorText(e.campaign_id?.message)}>
            <Select id="campaign_id" disabled={!companyId} {...form.register("campaign_id")}>
              <option value="">{t("creatives.noCampaign")}</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label={f("type")} htmlFor="type">
            <Select id="type" {...form.register("type")}>
              {CREATIVE_TYPES.map((x) => <option key={x} value={x}>{t(`creatives.type.${x}`)}</option>)}
            </Select>
          </Field>
          <Field label={f("aspect_ratio")} htmlFor="aspect_ratio">
            <Select id="aspect_ratio" {...form.register("aspect_ratio")}>
              {ASPECT_RATIOS.map((x) => <option key={x} value={x}>{x}</option>)}
            </Select>
          </Field>
          <Field label={f("file_url")} htmlFor="file_url" hint={t("creatives.fileHint")} error={errorText(e.file_url?.message)}>
            <Input id="file_url" dir="ltr" placeholder="https://drive.google.com/…" {...form.register("file_url")} />
          </Field>
          <Field label={f("thumbnail_url")} htmlFor="thumbnail_url" error={errorText(e.thumbnail_url?.message)}>
            <Input id="thumbnail_url" dir="ltr" placeholder="https://" {...form.register("thumbnail_url")} />
          </Field>
          <Field label={f("headline")} htmlFor="headline">
            <Input id="headline" {...form.register("headline")} />
          </Field>
          <Field label={f("cta")} htmlFor="cta">
            <Input id="cta" {...form.register("cta")} />
          </Field>
          <Field label={f("primary_text")} htmlFor="primary_text" className="sm:col-span-2">
            <Textarea id="primary_text" rows={3} {...form.register("primary_text")} />
          </Field>
          <Field label={f("designer")} htmlFor="designer">
            <Input id="designer" list="designers" {...form.register("designer")} />
            <datalist id="designers">{options.designers.map((d) => <option key={d} value={d} />)}</datalist>
          </Field>
          <Field label={f("copywriter")} htmlFor="copywriter">
            <Input id="copywriter" {...form.register("copywriter")} />
          </Field>
          <Field label={f("status")} htmlFor="status">
            <Select id="status" {...form.register("status")}>
              {statuses.map((s) => <option key={s} value={s}>{t(`creatives.status.${s}`)}</option>)}
            </Select>
          </Field>
          <Field label={f("tags")} htmlFor="tags" hint={t("creatives.tagsHint")}>
            <Input id="tags" {...form.register("tags")} />
          </Field>
          <Field label={f("external_ad_id")} htmlFor="external_ad_id" className="sm:col-span-2" hint={t("creatives.adIdHint")}>
            <Input id="external_ad_id" dir="ltr" className="num" {...form.register("external_ad_id")} />
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
