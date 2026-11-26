"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/actions/result";

/** Translates a validation key ("required") or error key ("forbidden"). */
export function useErrorText() {
  const t = useTranslations();
  return (key: string | undefined) => {
    if (!key) return undefined;
    // Errors with a detail: "missingFields:date,spend" or "rollbackBlocked:file.csv"
    const sep = key.indexOf(":");
    if (sep > 0 && t.has(`errors.${key.slice(0, sep)}`)) {
      const k = key.slice(0, sep);
      const arg = key.slice(sep + 1);
      const fields = arg
        .split(",")
        .map((f) => (t.has(`import.fields.${f}`) ? t(`import.fields.${f}`) : f))
        .join("، ");
      return t(`errors.${k}`, { fields, files: arg });
    }
    if (t.has(`validation.${key}`)) return t(`validation.${key}`);
    if (t.has(`errors.${key}`)) return t(`errors.${key}`);
    return key;
  };
}

/**
 * Runs a Server Action, shows a toast, maps field errors back onto the form,
 * and refreshes the page data on success.
 */
export function useAction() {
  const [pending, start] = useTransition();
  const router = useRouter();
  const errorText = useErrorText();
  const t = useTranslations("common");

  function run<T, F extends FieldValues = FieldValues>(
    fn: () => Promise<ActionResult<T>>,
    opts: { success?: string | false; setError?: UseFormSetError<F>; onSuccess?: (data: T) => void } = {},
  ) {
    start(async () => {
      const res = await fn();
      if (res.ok) {
        if (opts.success !== false) toast.success(opts.success ?? t("saved"));
        opts.onSuccess?.(res.data);
        router.refresh();
        return;
      }
      if (res.fieldErrors && opts.setError) {
        for (const [k, v] of Object.entries(res.fieldErrors)) opts.setError(k as Path<F>, { message: v });
      }
      toast.error(errorText(res.error));
    });
  }
  return { pending, run, errorText };
}
