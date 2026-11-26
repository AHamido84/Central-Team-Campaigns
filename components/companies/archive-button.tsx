"use client";
import { Archive, ArchiveRestore } from "lucide-react";
import { useTranslations } from "next-intl";
import { setCompanyArchived } from "@/lib/actions/companies";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { useAction } from "@/components/forms/use-action";

export function ArchiveCompanyButton({ id, archived }: { id: string; archived: boolean }) {
  const t = useTranslations("companies");
  const { pending, run } = useAction();
  if (archived) {
    return (
      <Button variant="outline" disabled={pending} onClick={() => run(() => setCompanyArchived(id, false), { success: t("restoredToast") })}>
        <ArchiveRestore />
        {t("restore")}
      </Button>
    );
  }
  return (
    <ConfirmButton
      variant="outline"
      disabled={pending}
      destructive={false}
      message={t("archiveConfirm")}
      confirmLabel={t("archive")}
      onConfirm={() => run(() => setCompanyArchived(id, true), { success: t("archivedToast") })}
    >
      <Archive />
      {t("archive")}
    </ConfirmButton>
  );
}
