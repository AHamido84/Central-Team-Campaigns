"use client";
import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function PrintButton({ variant = "outline" }: { variant?: "outline" | "ghost" }) {
  const t = useTranslations();
  return (
    <Button variant={variant} size="sm" onClick={() => window.print()}>
      <Printer />
      {t("reports.print")}
    </Button>
  );
}
