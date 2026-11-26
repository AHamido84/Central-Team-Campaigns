"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import type { z } from "zod";
import { createCompany, updateCompany } from "@/lib/actions/companies";
import { CompanyInput } from "@/types/forms";
import type { Company } from "@/types/entities";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/components/forms/use-action";

type In = z.input<typeof CompanyInput>;
type Out = z.output<typeof CompanyInput>;

export function CompanyFormDialog({ company, trigger }: { company?: Company; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations();
  const { pending, run, errorText } = useAction();
  const form = useForm<In, unknown, Out>({
    resolver: zodResolver(CompanyInput),
    defaultValues: company
      ? { ...company, status: company.status }
      : { name_ar: "", name_en: "", logo_url: "", industry: "", currency: "SAR", monthly_budget: 0, status: "active", account_manager: "", notes: "" },
  });
  const e = form.formState.errors;
  const f = (k: keyof Out) => t(`companies.f.${k}`);

  const onSubmit = form.handleSubmit((data) =>
    run(() => (company ? updateCompany(company.id, data) : createCompany(data)), {
      setError: form.setError,
      onSuccess: () => {
        setOpen(false);
        if (!company) form.reset();
      },
    }),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{company ? t("companies.edit") : t("companies.add")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label={f("name_ar")} htmlFor="name_ar" required error={errorText(e.name_ar?.message)}>
            <Input id="name_ar" {...form.register("name_ar")} />
          </Field>
          <Field label={f("name_en")} htmlFor="name_en" error={errorText(e.name_en?.message)}>
            <Input id="name_en" dir="ltr" {...form.register("name_en")} />
          </Field>
          <Field label={f("industry")} htmlFor="industry">
            <Input id="industry" {...form.register("industry")} />
          </Field>
          <Field label={f("account_manager")} htmlFor="account_manager">
            <Input id="account_manager" {...form.register("account_manager")} />
          </Field>
          <Field label={f("monthly_budget")} htmlFor="monthly_budget" error={errorText(e.monthly_budget?.message)}>
            <Input id="monthly_budget" type="number" inputMode="decimal" min={0} step="any" dir="ltr" className="num" {...form.register("monthly_budget")} />
          </Field>
          <Field label={f("currency")} htmlFor="currency" error={errorText(e.currency?.message)}>
            <Input id="currency" dir="ltr" maxLength={3} className="num uppercase" {...form.register("currency")} />
          </Field>
          <Field label={f("status")} htmlFor="status">
            <Select id="status" {...form.register("status")}>
              <option value="active">{t("status.active")}</option>
              <option value="paused">{t("status.paused")}</option>
              <option value="archived">{t("status.archived")}</option>
            </Select>
          </Field>
          <Field label={f("logo_url")} htmlFor="logo_url" hint={t("companies.logoHint")} error={errorText(e.logo_url?.message)}>
            <Input id="logo_url" dir="ltr" placeholder="https://" {...form.register("logo_url")} />
          </Field>
          <Field label={f("notes")} htmlFor="notes" className="sm:col-span-2">
            <Textarea id="notes" rows={3} {...form.register("notes")} />
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
