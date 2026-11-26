"use client";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { deleteCreative } from "@/lib/actions/creatives";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { useAction } from "@/components/forms/use-action";

export function DeleteCreativeButton({ id }: { id: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { pending, run } = useAction();
  return (
    <ConfirmButton
      variant="outline"
      disabled={pending}
      message={t("creatives.deleteConfirm")}
      onConfirm={() => run(() => deleteCreative(id), { success: t("common.deleted"), onSuccess: () => router.push("/creatives") })}
    >
      <Trash2 className="text-destructive" />
      {t("common.delete")}
    </ConfirmButton>
  );
}
