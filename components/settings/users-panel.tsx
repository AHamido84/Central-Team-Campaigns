"use client";
import { useState } from "react";
import { Check, Copy, KeyRound, Pencil, Plus, Trash2, Wand2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { removeUser, saveUser, suggestPassword } from "@/lib/actions/settings";
import { ROLES, type Role } from "@/types/entities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useAction } from "@/components/forms/use-action";

export interface UserRow { id: string; email: string; name: string; role: Role; company_ids: string[] }
type Company = { id: string; name: string };

/** Admins and managers always see every company, so the picker is only for the other roles. */
const scoped = (r: Role) => r !== "Admin" && r !== "Manager";

function UserDialog({ user, companies, trigger }: { user?: UserRow; companies: Company[]; trigger: React.ReactNode }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const blank = () => ({ email: user?.email ?? "", name: user?.name ?? "", role: user?.role ?? ("Viewer" as Role), company_ids: user?.company_ids ?? ["*"], password: "" });
  const [f, setF] = useState(blank);
  const [done, setDone] = useState<{ login: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { pending, run, errorText } = useAction();
  const all = f.company_ids.includes("*");
  const toggle = (id: string, on: boolean) => setF((x) => ({ ...x, company_ids: on ? [...x.company_ids.filter((c) => c !== "*"), id] : x.company_ids.filter((c) => c !== id) }));
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); setErrors({}); setDone(null); if (!o) setF(blank()); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{done ? t("settings.users.credsTitle") : user ? t("settings.users.edit") : t("settings.users.add")}</DialogTitle></DialogHeader>
        {done ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("settings.users.credsBody")}</p>
            <div className="space-y-2 rounded-lg border bg-muted/50 p-4 text-sm" dir="ltr">
              <p><span className="text-muted-foreground">{t("settings.users.email")}:</span> <span className="num font-medium">{done.login}</span></p>
              <p><span className="text-muted-foreground">{t("settings.users.password")}:</span> <span className="num font-medium">{done.password}</span></p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(`${t("settings.users.email")}: ${done.login}\n${t("settings.users.password")}: ${done.password}`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
              >
                {copied ? <Check /> : <Copy />}{t("settings.users.copyCreds")}
              </Button>
              <Button type="button" onClick={() => setOpen(false)}>{t("common.done")}</Button>
            </DialogFooter>
          </div>
        ) : (
        <form
          noValidate
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveUser(user?.id ?? null, f), {
              setError: (k, v) => setErrors((x) => ({ ...x, [k as string]: v.message ?? "" })),
              onSuccess: () => (f.password ? setDone({ login: f.email.trim().toLowerCase(), password: f.password }) : setOpen(false)),
            });
          }}
        >
          <Field label={t("settings.users.email")} htmlFor="u_email" required error={errorText(errors.email)} hint={t("settings.users.emailHint")}>
            <Input id="u_email" dir="ltr" autoCapitalize="none" spellCheck={false} autoComplete="off" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </Field>
          <Field label={user ? t("settings.users.newPassword") : t("settings.users.password")} htmlFor="u_password" required={!user} error={errorText(errors.password)} hint={user ? t("settings.users.keepPassword") : t("settings.users.passwordHint")}>
            <div className="flex gap-2">
              <Input id="u_password" dir="ltr" className="num" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
              <Button type="button" variant="outline" onClick={async () => setF({ ...f, password: await suggestPassword() })}><Wand2 />{t("settings.users.generate")}</Button>
            </div>
          </Field>
          <Field label={t("settings.users.name")} htmlFor="u_name" required error={errorText(errors.name)}>
            <Input id="u_name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label={t("settings.users.role")} htmlFor="u_role">
            <Select id="u_role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
              {ROLES.map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
            </Select>
          </Field>
          <p className="rounded-lg bg-muted px-3 py-2 text-xs leading-6 text-muted-foreground">{t(`settings.users.roleHelp.${f.role}`)}</p>
          {scoped(f.role) && (
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium">{t("settings.users.companies")}</legend>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={all} onCheckedChange={(v) => setF({ ...f, company_ids: v ? ["*"] : [] })} />
                {t("settings.users.allCompanies")}
              </label>
              {!all && (
                <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
                  {companies.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={f.company_ids.includes(c.id)} onCheckedChange={(v) => toggle(c.id, !!v)} />
                      {c.name}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={pending}>{pending ? t("common.saving") : t("common.save")}</Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function UsersPanel({ users, companies, me, envAdmin }: { users: (UserRow & { hasPassword: boolean })[]; companies: Company[]; me: string; envAdmin: string }) {
  const t = useTranslations();
  const { pending, run } = useAction();
  const cName = new Map(companies.map((c) => [c.id, c.name]));
  const variant = (r: Role) => (r === "Admin" ? "default" : r === "Manager" ? "accent" : "muted") as "default" | "accent" | "muted";
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3">
        <div>
          <h3 className="font-semibold">{t("settings.users.title")}</h3>
          <p className="text-sm text-muted-foreground">{t("settings.users.body")}</p>
        </div>
        <UserDialog companies={companies} trigger={<Button size="sm"><Plus />{t("settings.users.add")}</Button>} />
      </div>
      <div className="overflow-x-auto">
        <Table>
          <THead>
            <TR>
              <TH>{t("settings.users.name")}</TH>
              <TH>{t("settings.users.role")}</TH>
              <TH>{t("settings.users.companies")}</TH>
              <TH className="w-24" />
            </TR>
          </THead>
          <TBody>
            {users.map((u) => (
              <TR key={u.id}>
                <TD>
                  <p className="font-medium">{u.name}{u.email === me && <span className="ms-2 text-xs text-muted-foreground">({t("settings.users.you")})</span>}</p>
                  <p className="num text-xs text-muted-foreground" dir="ltr">{u.email}</p>
                  {!u.hasPassword && <p className="mt-1 flex items-center gap-1 text-xs text-warning"><KeyRound className="size-3" />{t("settings.users.noPassword")}</p>}
                </TD>
                <TD><Badge variant={variant(u.role)}>{t(`roles.${u.role}`)}</Badge></TD>
                <TD className="max-w-xs text-sm text-muted-foreground">
                  {!scoped(u.role) || u.company_ids.includes("*") ? t("settings.users.allCompanies") : u.company_ids.length ? u.company_ids.map((id) => cName.get(id) ?? id).join("، ") : <span className="text-destructive">{t("settings.users.noCompanies")}</span>}
                </TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    <UserDialog user={u} companies={companies} trigger={<Button variant="ghost" size="icon" aria-label={t("common.edit")}><Pencil /></Button>} />
                    {u.email !== me && (
                      <ConfirmButton variant="ghost" size="icon" aria-label={t("common.delete")} disabled={pending} message={t("settings.users.removeConfirm", { name: u.name })} confirmLabel={t("settings.users.remove")} onConfirm={() => run(() => removeUser(u.id), { success: t("settings.users.removed") })}>
                        <Trash2 className="text-destructive" />
                      </ConfirmButton>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
      {envAdmin && (
        <p className="border-t px-5 py-3 text-xs text-muted-foreground">
          {t("settings.users.envAdmin")} <span className="num" dir="ltr">{envAdmin}</span>
        </p>
      )}
    </Card>
  );
}
