"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { z } from "zod";
import { deleteAdSet, saveAdSet } from "@/lib/actions/campaigns";
import { formatCurrency } from "@/lib/format";
import { AdSetInput } from "@/types/forms";
import { CAMPAIGN_STATUS, type AdSet } from "@/types/entities";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useAction } from "@/components/forms/use-action";

type In = z.input<typeof AdSetInput>;
type Out = z.output<typeof AdSetInput>;

function AdSetDialog({ campaignId, adSet, trigger }: { campaignId: string; adSet?: AdSet; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations();
  const { pending, run, errorText } = useAction();
  const form = useForm<In, unknown, Out>({
    resolver: zodResolver(AdSetInput),
    defaultValues: adSet ?? { campaign_id: campaignId, name: "", audience: "", placements: "", budget: 0, status: "active", external_adset_id: "" },
  });
  const e = form.formState.errors;
  const f = (k: keyof Out) => t(`campaigns.as.${k}`);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{adSet ? t("campaigns.editAdSet") : t("campaigns.addAdSet")}</DialogTitle>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={form.handleSubmit((d) =>
            run(() => saveAdSet(adSet?.id ?? null, d), {
              setError: form.setError,
              onSuccess: () => {
                setOpen(false);
                if (!adSet) form.reset();
              },
            }),
          )}
        >
          <input type="hidden" {...form.register("campaign_id")} />
          <Field label={f("name")} htmlFor="as_name" required error={errorText(e.name?.message)} className="sm:col-span-2">
            <Input id="as_name" {...form.register("name")} />
          </Field>
          <Field label={f("audience")} htmlFor="audience" className="sm:col-span-2">
            <Input id="audience" {...form.register("audience")} />
          </Field>
          <Field label={f("placements")} htmlFor="placements">
            <Input id="placements" {...form.register("placements")} />
          </Field>
          <Field label={f("budget")} htmlFor="as_budget" error={errorText(e.budget?.message)}>
            <Input id="as_budget" type="number" min={0} step="any" dir="ltr" className="num" {...form.register("budget")} />
          </Field>
          <Field label={f("status")} htmlFor="as_status">
            <Select id="as_status" {...form.register("status")}>
              {CAMPAIGN_STATUS.map((s) => (
                <option key={s} value={s}>{t(`status.${s}`)}</option>
              ))}
            </Select>
          </Field>
          <Field label={f("external_adset_id")} htmlFor="external_adset_id">
            <Input id="external_adset_id" dir="ltr" className="num" {...form.register("external_adset_id")} />
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

export function AdSetsPanel({ campaignId, adSets, currency, canManage }: { campaignId: string; adSets: AdSet[]; currency: string; canManage: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const { run } = useAction();
  return (
    <Card>
      <div className="flex items-center justify-between p-5 pb-3">
        <h3 className="flex items-center gap-2 font-semibold"><Layers className="size-4 text-muted-foreground" />{t("campaigns.adSets")}</h3>
        {canManage && <AdSetDialog campaignId={campaignId} trigger={<Button size="sm"><Plus />{t("campaigns.addAdSet")}</Button>} />}
      </div>
      {adSets.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-muted-foreground">{t("campaigns.adSetsEmpty")}</p>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>{t("campaigns.as.name")}</TH>
              <TH>{t("campaigns.as.audience")}</TH>
              <TH>{t("campaigns.as.placements")}</TH>
              <TH>{t("campaigns.as.budget")}</TH>
              <TH>{t("campaigns.as.status")}</TH>
              {canManage && <TH className="w-24" />}
            </TR>
          </THead>
          <TBody>
            {adSets.map((a) => (
              <TR key={a.id}>
                <TD className="font-medium">{a.name}</TD>
                <TD className="max-w-[240px] truncate text-muted-foreground">{a.audience || "—"}</TD>
                <TD className="text-muted-foreground">{a.placements || "—"}</TD>
                <TD className="num">{a.budget ? formatCurrency(a.budget, currency, locale, 0) : "—"}</TD>
                <TD><StatusBadge status={a.status} /></TD>
                {canManage && (
                  <TD>
                    <div className="flex justify-end gap-1">
                      <AdSetDialog campaignId={campaignId} adSet={a} trigger={<Button variant="ghost" size="icon" aria-label={t("common.edit")}><Pencil /></Button>} />
                      <ConfirmButton variant="ghost" size="icon" aria-label={t("common.delete")} message={a.name} onConfirm={() => run(() => deleteAdSet(a.id), { success: t("common.deleted") })}>
                        <Trash2 className="text-destructive" />
                      </ConfirmButton>
                    </div>
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}
