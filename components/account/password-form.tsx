"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { changeOwnPassword } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAction } from "@/components/forms/use-action";

export function PasswordForm() {
  const t = useTranslations();
  const empty = { current: "", next: "", confirm: "" };
  const [v, setV] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { pending, run, errorText } = useAction();
  const field = (k: keyof typeof empty, ac: string) => (
    <Field label={t(`account.${k}`)} htmlFor={`pw_${k}`} required error={errorText(errors[k])} hint={k === "next" ? t("account.nextHint") : undefined}>
      <Input id={`pw_${k}`} type="password" dir="ltr" autoComplete={ac} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
    </Field>
  );
  return (
    <Card className="max-w-md p-5">
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setErrors({});
          run(() => changeOwnPassword(v), {
            success: t("account.changed"),
            setError: (k, m) => setErrors((x) => ({ ...x, [k as string]: m.message ?? "" })),
            onSuccess: () => setV(empty),
          });
        }}
      >
        {field("current", "current-password")}
        {field("next", "new-password")}
        {field("confirm", "new-password")}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>{pending ? t("common.saving") : t("account.submit")}</Button>
        </div>
      </form>
    </Card>
  );
}
