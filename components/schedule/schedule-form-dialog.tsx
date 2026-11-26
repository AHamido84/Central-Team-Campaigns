"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import type { z } from "zod";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { saveScheduleEntry, setScheduleStatus } from "@/lib/actions/schedule";
import { ScheduleInput } from "@/types/forms";
import { SCHEDULE_STATUS, type CreativeSchedule } from "@/types/entities";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/components/forms/use-action";

type In = z.input<typeof ScheduleInput>;
type Out = z.output<typeof ScheduleInput>;

export interface ScheduleFormOptions {
  companies: { id: string; name: string }[];
  platforms: { id: string; name: string }[];
  creatives: { id: string; title: string; company_id: string; campaign_id: string; status: string }[];
  campaigns: { id: string; name: string; company_id: string; platform_id: string }[];
  owners: { email: string; name: string }[];
}

export interface DialogState {
  entry?: CreativeSchedule;
  date?: string;
  creativeId?: string;
}

export function ScheduleFormDialog({ state, onClose, options, canManage, canPublish, defaultOwner, fixedCompanyId }: { state: DialogState | null; onClose: () => void; options: ScheduleFormOptions; canManage: boolean; canPublish: boolean; defaultOwner?: string; fixedCompanyId?: string }) {
  const t = useTranslations();
  const { pending, run, errorText } = useAction();
  const meta = options.platforms.find((p) => p.name === "Meta")?.id ?? options.platforms[0]?.id ?? "";
  const blank = (s: DialogState | null): In => {
    const cr = options.creatives.find((c) => c.id === s?.creativeId);
    return s?.entry
      ? { ...s.entry }
      : { creative_id: cr?.id ?? "", platform_id: options.campaigns.find((c) => c.id === cr?.campaign_id)?.platform_id ?? meta, campaign_id: cr?.campaign_id ?? "", scheduled_date: s?.date ?? "", scheduled_time: "", owner: defaultOwner ?? "", status: "scheduled", notes: "" };
  };
  const form = useForm<In, unknown, Out>({ resolver: zodResolver(ScheduleInput), defaultValues: blank(state) });
  useEffect(() => {
    if (state) form.reset(blank(state));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const e = form.formState.errors;
  const creativeId = form.watch("creative_id");
  const creative = options.creatives.find((c) => c.id === creativeId);
  const campaigns = options.campaigns.filter((c) => c.company_id === creative?.company_id);
  const creatives = options.creatives.filter((c) => !fixedCompanyId || c.company_id === fixedCompanyId);
  const groups = options.companies.map((co) => ({ ...co, items: creatives.filter((c) => c.company_id === co.id) })).filter((g) => g.items.length);
  const entry = state?.entry;
  const readOnly = !canManage;
  const f = (k: keyof Out) => t(`schedule.f.${k}`);

  const onCreativeChange = (id: string) => {
    const cr = options.creatives.find((c) => c.id === id);
    if (cr?.campaign_id) {
      form.setValue("campaign_id", cr.campaign_id);
      const camp = options.campaigns.find((c) => c.id === cr.campaign_id);
      if (camp) form.setValue("platform_id", camp.platform_id);
    } else form.setValue("campaign_id", "");
  };
  const status = (s: "published" | "cancelled") =>
    run(() => setScheduleStatus(entry!.id, s), {
      success: false,
      onSuccess: (r) => {
        toast.success(s === "published" ? (r.creativeLive ? t("schedule.publishedLive") : t("schedule.publishedToast")) : t("schedule.cancelledToast"));
        onClose();
      },
    });

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entry ? (readOnly ? t("schedule.details") : t("schedule.edit")) : t("schedule.add")}</DialogTitle>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={form.handleSubmit((d) => run(() => saveScheduleEntry(entry?.id ?? null, d), { setError: form.setError, onSuccess: onClose }))}
        >
          <fieldset disabled={readOnly} className="contents">
            <Field label={f("creative_id")} htmlFor="s_creative" required error={errorText(e.creative_id?.message)} className="sm:col-span-2">
              <Select id="s_creative" {...form.register("creative_id", { onChange: (ev) => onCreativeChange(ev.target.value) })}>
                <option value="">—</option>
                {groups.map((g) => (
                  <optgroup key={g.id} label={g.name}>
                    {g.items.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </optgroup>
                ))}
              </Select>
            </Field>
            {creative && !["approved", "live", "paused"].includes(creative.status) && <p className="-mt-2 text-xs text-warning sm:col-span-2">{t("schedule.notApprovedYet", { status: t(`creatives.status.${creative.status}`) })}</p>}
            <Field label={f("platform_id")} htmlFor="s_platform" required error={errorText(e.platform_id?.message)}>
              <Select id="s_platform" {...form.register("platform_id")}>
                {options.platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label={f("campaign_id")} htmlFor="s_campaign" error={errorText(e.campaign_id?.message)}>
              <Select id="s_campaign" {...form.register("campaign_id")}>
                <option value="">{t("creatives.noCampaign")}</option>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label={f("scheduled_date")} htmlFor="s_date" required error={errorText(e.scheduled_date?.message)}>
              <Input id="s_date" type="date" dir="ltr" className="num" {...form.register("scheduled_date")} />
            </Field>
            <Field label={f("scheduled_time")} htmlFor="s_time" error={errorText(e.scheduled_time?.message)}>
              <Input id="s_time" type="time" dir="ltr" className="num" {...form.register("scheduled_time")} />
            </Field>
            <Field label={f("owner")} htmlFor="s_owner">
              <Select id="s_owner" {...form.register("owner")}>
                <option value="">—</option>
                {options.owners.map((o) => <option key={o.email} value={o.email}>{o.name}</option>)}
              </Select>
            </Field>
            <Field label={f("status")} htmlFor="s_status">
              <Select id="s_status" {...form.register("status")}>
                {SCHEDULE_STATUS.filter((s) => s !== "late").map((s) => <option key={s} value={s}>{t(`schedule.status.${s}`)}</option>)}
              </Select>
            </Field>
            <Field label={f("notes")} htmlFor="s_notes" className="sm:col-span-2">
              <Textarea id="s_notes" rows={2} {...form.register("notes")} />
            </Field>
          </fieldset>
          <DialogFooter className="gap-2 sm:col-span-2 sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {entry && entry.status !== "published" && (canManage || canPublish) && (
                <Button type="button" variant="accent" disabled={pending} onClick={() => status("published")}><CheckCircle2 />{t("schedule.markPublished")}</Button>
              )}
              {entry && canManage && entry.status !== "cancelled" && entry.status !== "published" && (
                <Button type="button" variant="ghost" disabled={pending} onClick={() => status("cancelled")}><XCircle />{t("schedule.cancelPost")}</Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
              {canManage && <Button type="submit" disabled={pending}>{pending ? t("common.saving") : t("common.save")}</Button>}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
