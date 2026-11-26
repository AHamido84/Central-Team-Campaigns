import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Panel } from "@/components/dashboard/panels";
import { PlatformDot } from "@/components/platforms/platform-badge";
import type { ScheduleEntry, scheduleWidgets } from "@/lib/data/schedule";
import { cn } from "@/lib/utils";

type W = Awaited<ReturnType<typeof scheduleWidgets>>;

async function Rows({ items, showDate = false, empty }: { items: ScheduleEntry[]; showDate?: boolean; empty: string }) {
  const locale = await getLocale();
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" });
  if (!items.length) return <p className="py-4 text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y">
      {items.slice(0, 6).map((e) => {
        const Icon = e.effective === "published" ? CheckCircle2 : e.effective === "late" ? AlertTriangle : Clock;
        return (
          <li key={e.id} className="flex items-center gap-2 py-2 text-sm">
            <Icon className={cn("size-4 shrink-0", e.effective === "published" ? "text-success" : e.effective === "late" ? "text-destructive" : "text-muted-foreground")} />
            <span className="num w-20 shrink-0 text-xs text-muted-foreground" dir="ltr">{showDate ? fmt.format(new Date(`${e.scheduled_date}T00:00:00Z`)) : e.scheduled_time || "—"}</span>
            <Link href={`/creatives/${e.creative_id}`} className="min-w-0 flex-1 truncate hover:underline">{e.creative_title}</Link>
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><PlatformDot name={e.platform_name} className="size-2" />{e.platform_name}</span>
          </li>
        );
      })}
      {items.length > 6 && <li className="pt-2 text-xs text-muted-foreground">+{items.length - 6}</li>}
    </ul>
  );
}

export async function ScheduleWidgets({ w, companyId }: { w: W; companyId?: string }) {
  const t = await getTranslations();
  const base = companyId ? `/companies/${companyId}?tab=schedule` : "/schedule";
  const sep = base.includes("?") ? "&" : "?";
  const late = w.late.length ? (
    <Link href={`${base}${sep}view=list&status=late`} className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive hover:underline">
      <AlertTriangle className="size-3" />{t("schedule.lateCount", { n: w.late.length })}
    </Link>
  ) : null;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title={t("schedule.widgetToday")} description={t("schedule.widgetTodayHint", { n: w.today.length })} action={late ?? <CalendarClock className="size-4 text-muted-foreground" />}>
        <Rows items={w.today} empty={t("schedule.nothingToday")} />
      </Panel>
      <Panel title={t("schedule.widgetWeek")} description={t("schedule.widgetWeekHint", { n: w.week.length })} action={<Link href={`${base}${sep}view=week`} className="text-xs text-muted-foreground hover:text-foreground hover:underline">{t("schedule.openCalendar")}</Link>}>
        <Rows items={w.week} showDate empty={t("schedule.nothingWeek")} />
      </Panel>
    </div>
  );
}
