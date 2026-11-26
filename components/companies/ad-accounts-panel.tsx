"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { z } from "zod";
import { deleteAdAccount, saveAdAccount } from "@/lib/actions/companies";
import { AdAccountInput } from "@/types/forms";
import type { AdAccount, Platform } from "@/types/entities";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { PlatformBadge } from "@/components/platforms/platform-badge";
import { useAction } from "@/components/forms/use-action";

type In = z.input<typeof AdAccountInput>;
type Out = z.output<typeof AdAccountInput>;

function AccountDialog({ companyId, platforms, account, trigger }: { companyId: string; platforms: Platform[]; account?: AdAccount; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations();
  const { pending, run, errorText } = useAction();
  const form = useForm<In, unknown, Out>({
    resolver: zodResolver(AdAccountInput),
    defaultValues: account ?? { company_id: companyId, platform_id: (platforms.find((p) => p.name === "Meta") ?? platforms[0])?.id ?? "", account_name: "", external_account_id: "" },
  });
  const e = form.formState.errors;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{account ? t("accounts.edit") : t("accounts.add")}</DialogTitle>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={form.handleSubmit((d) =>
            run(() => saveAdAccount(account?.id ?? null, d), {
              setError: form.setError,
              onSuccess: () => {
                setOpen(false);
                if (!account) form.reset();
              },
            }),
          )}
        >
          <input type="hidden" {...form.register("company_id")} />
          <Field label={t("accounts.f.platform_id")} htmlFor="platform_id" required error={errorText(e.platform_id?.message)}>
            <Select id="platform_id" {...form.register("platform_id")}>
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("accounts.f.account_name")} htmlFor="account_name" required error={errorText(e.account_name?.message)}>
            <Input id="account_name" {...form.register("account_name")} />
          </Field>
          <Field label={t("accounts.f.external_account_id")} htmlFor="external_account_id">
            <Input id="external_account_id" dir="ltr" className="num" placeholder="act_1234567890" {...form.register("external_account_id")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={pending}>{pending ? t("common.saving") : t("common.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdAccountsPanel({ companyId, accounts, platforms, canManage }: { companyId: string; accounts: AdAccount[]; platforms: Platform[]; canManage: boolean }) {
  const t = useTranslations();
  const { run } = useAction();
  const pName = (id: string) => platforms.find((p) => p.id === id)?.name ?? "—";
  const add = canManage ? (
    <AccountDialog companyId={companyId} platforms={platforms} trigger={<Button><Plus />{t("accounts.add")}</Button>} />
  ) : null;

  if (!accounts.length) return <EmptyState icon={CreditCard} title={t("accounts.emptyTitle")} body={t("accounts.emptyBody")} action={add} />;

  return (
    <Card>
      <div className="flex items-center justify-between p-5 pb-3">
        <h3 className="font-semibold">{t("accounts.title")}</h3>
        {add}
      </div>
      <Table>
        <THead>
          <TR>
            <TH>{t("accounts.f.platform_id")}</TH>
            <TH>{t("accounts.f.account_name")}</TH>
            <TH>{t("accounts.f.external_account_id")}</TH>
            {canManage && <TH className="w-24" />}
          </TR>
        </THead>
        <TBody>
          {accounts.map((a) => (
            <TR key={a.id}>
              <TD><PlatformBadge name={pName(a.platform_id)} /></TD>
              <TD className="font-medium">{a.account_name}</TD>
              <TD className="num text-muted-foreground">{a.external_account_id || "—"}</TD>
              {canManage && (
                <TD>
                  <div className="flex justify-end gap-1">
                    <AccountDialog companyId={companyId} platforms={platforms} account={a} trigger={<Button variant="ghost" size="icon" aria-label={t("common.edit")}><Pencil /></Button>} />
                    <ConfirmButton variant="ghost" size="icon" aria-label={t("common.delete")} message={a.account_name} onConfirm={() => run(() => deleteAdAccount(a.id), { success: t("common.deleted") })}>
                      <Trash2 className="text-destructive" />
                    </ConfirmButton>
                  </div>
                </TD>
              )}
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}
