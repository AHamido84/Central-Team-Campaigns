"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, List, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { addDays, addMonths, weekStart } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { ScheduleView } from "./schedule-calendar";

export function ScheduleToolbar({ view, anchor, today, options, hideCompany = false, action }: { view: ScheduleView; anchor: string; today: string; options: { companies: { id: string; name: string }[]; platforms: { id: string; name: string }[]; owners: { email: string; name: string }[] }; hideCompany?: boolean; action?: React.ReactNode }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const href = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    return `${pathname}?${next}`;
  };
  const set = (patch: Record<string, string>) => start(() => router.replace(href(patch), { scroll: false }));
  const step = (n: number) => (view === "week" ? addDays(anchor, 7 * n) : addMonths(anchor, n));
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const dfmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const ws = weekStart(anchor);
  const title = view === "week" ? `${dfmt.format(new Date(`${ws}T00:00:00Z`))} – ${dfmt.format(new Date(`${addDays(ws, 6)}T00:00:00Z`))}` : fmt.format(new Date(`${anchor}T00:00:00Z`));
  const views: [ScheduleView, typeof CalendarDays][] = [["month", CalendarDays], ["week", CalendarRange], ["list", List]];
  const Prev = locale === "ar" ? ChevronRight : ChevronLeft;
  const Next = locale === "ar" ? ChevronLeft : ChevronRight;

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border bg-card p-1" role="tablist">
          {views.map(([v, Icon]) => (
            <Link key={v} href={href({ view: v })} scroll={false} role="tab" aria-selected={view === v} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="size-4" />
              {t(`schedule.view.${v}`)}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button asChild variant="outline" size="icon" className="size-9"><Link href={href({ date: step(-1) })} scroll={false} aria-label={t("schedule.prev")}><Prev /></Link></Button>
          <Button asChild variant="outline" size="sm"><Link href={href({ date: "" })} scroll={false}>{t("schedule.today")}</Link></Button>
          <Button asChild variant="outline" size="icon" className="size-9"><Link href={href({ date: step(1) })} scroll={false} aria-label={t("schedule.next")}><Next /></Link></Button>
        </div>
        <h2 className="num text-lg font-semibold">{title}</h2>
        <div className="ms-auto">{action}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!hideCompany && options.companies.length > 1 && (
          <Select aria-label={t("filters.company")} value={sp.get("company") ?? ""} onChange={(e) => set({ company: e.target.value })} className="h-9 w-44">
            <option value="">{t("filters.allCompanies")}</option>
            {options.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        )}
        <Select aria-label={t("filters.platform")} value={sp.get("platform") ?? ""} onChange={(e) => set({ platform: e.target.value })} className="h-9 w-36">
          <option value="">{t("filters.allPlatforms")}</option>
          {options.platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select aria-label={t("filters.status")} value={sp.get("status") ?? ""} onChange={(e) => set({ status: e.target.value })} className="h-9 w-36">
          <option value="">{t("filters.allStatuses")}</option>
          {(["scheduled", "late", "published", "cancelled"] as const).map((s) => <option key={s} value={s}>{t(`schedule.status.${s}`)}</option>)}
        </Select>
        <Select aria-label={t("schedule.f.owner")} value={sp.get("owner") ?? ""} onChange={(e) => set({ owner: e.target.value })} className="h-9 w-40">
          <option value="">{t("schedule.allOwners")}</option>
          {options.owners.map((o) => <option key={o.email} value={o.email}>{o.name}</option>)}
        </Select>
        {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>
    </div>
  );
}
