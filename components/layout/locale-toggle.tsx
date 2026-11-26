"use client";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/i18n/actions";
import { Button } from "@/components/ui/button";

export function LocaleToggle() {
  const locale = useLocale();
  const t = useTranslations("common");
  const [pending, start] = useTransition();
  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(() => setLocale(locale === "ar" ? "en" : "ar"))} className="gap-1.5">
      <Languages />
      <span className="hidden sm:inline">{t("language")}</span>
    </Button>
  );
}
