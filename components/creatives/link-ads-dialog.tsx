"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { linkAdsToCreative } from "@/lib/actions/creatives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAction } from "@/components/forms/use-action";
import { formatCurrency } from "@/lib/format";

export function LinkAdsDialog({ creativeId, ads, currency }: { creativeId: string; ads: { name: string; spend: number }[]; currency: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const { pending, run } = useAction();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Link2 />{t("creatives.linkAds")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("creatives.linkAds")}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{t("creatives.linkAdsHint")}</p>
        {ads.length ? (
          <ul className="max-h-72 space-y-1 overflow-y-auto rounded-lg border p-2">
            {ads.map((a) => (
              <li key={a.name}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                  <input type="checkbox" className="size-4" checked={picked.includes(a.name)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, a.name] : p.filter((x) => x !== a.name)))} />
                  <span className="min-w-0 flex-1 truncate">{a.name}</span>
                  <span className="num text-xs text-muted-foreground">{formatCurrency(a.spend, currency, locale, 0)}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border p-4 text-center text-sm text-muted-foreground">{t("creatives.noUnlinked")}</p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
          <Button disabled={pending || !picked.length} onClick={() => run(() => linkAdsToCreative(creativeId, picked), { success: false, onSuccess: (r) => { setOpen(false); setPicked([]); toast.success(t("creatives.linkedToast", { n: r.linked })); } })}>
            {t("creatives.linkSelected", { n: picked.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
