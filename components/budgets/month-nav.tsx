"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { toast } from "sonner";
import { copyPreviousMonth } from "@/lib/actions/budgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAction } from "@/components/forms/use-action";

const shift = (month: string, n: number) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
};

export function MonthNav({ month, copyIds }: { month: string; copyIds: string[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { pending, run } = useAction();
  const href = (m: string) => {
    const next = new URLSearchParams(sp.toString());
    next.set("month", m);
    return `${pathname}?${next}`;
  };
  const Prev = locale === "ar" ? ChevronRight : ChevronLeft;
  const Next = locale === "ar" ? ChevronLeft : ChevronRight;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="icon" className="size-9"><Link href={href(shift(month, -1))} scroll={false} aria-label={t("schedule.prev")}><Prev /></Link></Button>
      <Input type="month" value={month} onChange={(e) => e.target.value && router.replace(href(e.target.value), { scroll: false })} className="num h-9 w-40" dir="ltr" aria-label={t("budgets.month")} />
      <Button asChild variant="outline" size="icon" className="size-9"><Link href={href(shift(month, 1))} scroll={false} aria-label={t("schedule.next")}><Next /></Link></Button>
      {copyIds.length > 0 && (
        <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => copyPreviousMonth(month, copyIds), { success: false, onSuccess: (r) => toast.success(t("budgets.copied", { n: r.copied })) })}>
          <Copy />{t("budgets.copyPrev")}
        </Button>
      )}
    </div>
  );
}
