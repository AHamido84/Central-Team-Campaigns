"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import type { z } from "zod";
import { saveMonthPlan } from "@/lib/actions/budgets";
import { MonthPlanInput } from "@/types/forms";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAction } from "@/components/forms/use-action";
import { formatCurrency } from "@/lib/format";

type In = z.input<typeof MonthPlanInput>;
type Out = z.output<typeof MonthPlanInput>;

export function PlanDialog({ companyId, companyName, month, currency, platforms, current, target, trigger, locale }: { companyId: string; companyName: string; month: string; currency: string; platforms: { id: string; name: string }[]; current: Record<string, number>; target: { leads: number; cpl: number; roas: number; spend: number } | null; trigger: React.ReactNode; locale: string }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const { pending, run, errorText } = useAction();
  const form = useForm<In, unknown, Out>({
    resolver: zodResolver(MonthPlanInput),
    defaultValues: { month, budgets: Object.fromEntries(platforms.map((p) => [p.id, current[p.id] ?? 0])), target_leads: target?.leads ?? 0, target_cpl: target?.cpl ?? 0, target_roas: target?.roas ?? 0, target_spend: target?.spend ?? 0 },
  });
  const e = form.formState.errors;
  const values = form.watch("budgets") as Record<string, number | string>;
  const total = Object.values(values ?? {}).reduce<number>((s, v) => s + (Number(v) || 0), 0);
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) form.reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("budgets.editPlan", { company: companyName })} <span className="num text-muted-foreground" dir="ltr">{month}</span></DialogTitle>
        </DialogHeader>
        <form noValidate className="space-y-5" onSubmit={form.handleSubmit((d) => run(() => saveMonthPlan(companyId, d), { setError: form.setError, onSuccess: () => setOpen(false) }))}>
          <input type="hidden" {...form.register("month")} />
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold">{t("budgets.budgetByPlatform")}</legend>
            {platforms.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <label htmlFor={`b_${p.id}`} className="w-28 shrink-0 text-sm">{p.name}</label>
                <Input id={`b_${p.id}`} type="number" min={0} step="any" inputMode="decimal" dir="ltr" className="num" {...form.register(`budgets.${p.id}` as const)} />
              </div>
            ))}
            <p className="flex justify-between border-t pt-2 text-sm"><span className="text-muted-foreground">{t("budgets.total")}</span><span className="num font-semibold">{formatCurrency(total, currency, locale, 0)}</span></p>
          </fieldset>
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-semibold">{t("budgets.targets")}</legend>
            {(["target_leads", "target_cpl", "target_roas", "target_spend"] as const).map((k) => (
              <Field key={k} label={t(`budgets.f.${k}`)} htmlFor={k} error={errorText(e[k]?.message)}>
                <Input id={k} type="number" min={0} step="any" inputMode="decimal" dir="ltr" className="num" {...form.register(k)} />
              </Field>
            ))}
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={pending}>{pending ? t("common.saving") : t("common.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
