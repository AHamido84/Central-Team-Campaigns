"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScheduleFormDialog, type DialogState, type ScheduleFormOptions } from "./schedule-form-dialog";

export function AddScheduleButton({ options, defaultOwner, fixedCompanyId, canPublish, date, creativeId, variant = "accent", label }: { options: ScheduleFormOptions; defaultOwner?: string; fixedCompanyId?: string; canPublish: boolean; date?: string; creativeId?: string; variant?: "accent" | "outline"; label?: string }) {
  const t = useTranslations();
  const [state, setState] = useState<DialogState | null>(null);
  return (
    <>
      <Button variant={variant} size={variant === "outline" ? "sm" : "default"} onClick={() => setState({ date, creativeId })}>
        <Plus />
        {label ?? t("schedule.add")}
      </Button>
      <ScheduleFormDialog state={state} onClose={() => setState(null)} options={options} canManage canPublish={canPublish} defaultOwner={defaultOwner} fixedCompanyId={fixedCompanyId} />
    </>
  );
}
