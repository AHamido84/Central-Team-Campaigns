"use client";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { deleteCampaign } from "@/lib/actions/campaigns";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { useAction } from "@/components/forms/use-action";

export function DeleteCampaignButton({ id }: { id: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { pending, run } = useAction();
  return (
    <ConfirmButton
      variant="outline"
      disabled={pending}
      message={t("campaigns.deleteConfirm")}
      onConfirm={() => run(() => deleteCampaign(id), { success: t("common.deleted"), onSuccess: () => router.push("/campaigns") })}
    >
      <Trash2 className="text-destructive" />
      {t("common.delete")}
    </ConfirmButton>
  );
}
