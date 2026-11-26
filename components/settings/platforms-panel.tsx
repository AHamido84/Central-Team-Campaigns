"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { z } from "zod";
import { savePlatform } from "@/lib/actions/companies";
import { PlatformInput } from "@/types/forms";
import type { Platform } from "@/types/entities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { PlatformBadge } from "@/components/platforms/platform-badge";
import { useAction } from "@/components/forms/use-action";

type In = z.input<typeof PlatformInput>;
type Out = z.output<typeof PlatformInput>;

function PlatformDialog({ platform, trigger }: { platform?: Platform; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations();
  const { pending, run, errorText } = useAction();
  const form = useForm<In, unknown, Out>({
    resolver: zodResolver(PlatformInput),
    defaultValues: platform ?? { name: "", icon: "", is_active: true },
  });
  const active = form.watch("is_active");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{platform ? t("platforms.edit") : t("platforms.add")}</DialogTitle>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={form.handleSubmit((d) => run(() => savePlatform(platform?.id ?? null, d), { setError: form.setError, onSuccess: () => setOpen(false) }))}
        >
          <Field label={t("platforms.f.name")} htmlFor="p_name" required error={errorText(form.formState.errors.name?.message)}>
            <Input id="p_name" dir="ltr" {...form.register("name")} />
          </Field>
          <Field label={t("platforms.f.icon")} htmlFor="p_icon">
            <Input id="p_icon" dir="ltr" {...form.register("icon")} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={!!active} onCheckedChange={(v) => form.setValue("is_active", !!v)} />
            {t("platforms.f.is_active")}
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={pending}>{pending ? t("common.saving") : t("common.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PlatformsPanel({ platforms }: { platforms: Platform[] }) {
  const t = useTranslations();
  return (
    <Card>
      <div className="flex items-center justify-between p-5 pb-3">
        <h3 className="font-semibold">{t("platforms.title")}</h3>
        <PlatformDialog trigger={<Button size="sm"><Plus />{t("platforms.add")}</Button>} />
      </div>
      <Table>
        <THead>
          <TR>
            <TH>{t("platforms.f.name")}</TH>
            <TH>{t("platforms.f.icon")}</TH>
            <TH>{t("platforms.f.is_active")}</TH>
            <TH className="w-16" />
          </TR>
        </THead>
        <TBody>
          {platforms.map((p) => (
            <TR key={p.id}>
              <TD><PlatformBadge name={p.name} /></TD>
              <TD className="num text-muted-foreground">{p.icon || "—"}</TD>
              <TD>{p.is_active ? <Badge variant="success">{t("platforms.active")}</Badge> : <Badge variant="muted">{t("platforms.inactive")}</Badge>}</TD>
              <TD>
                <PlatformDialog platform={p} trigger={<Button variant="ghost" size="icon" aria-label={t("common.edit")}><Pencil /></Button>} />
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}
