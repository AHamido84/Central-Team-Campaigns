"use client";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, Clock, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { rescheduleEntry } from "@/lib/actions/schedule";
import type { ScheduleEntry } from "@/lib/data/schedule";
import { addDays, monthGrid, weekStart } from "@/lib/dates";
import { PlatformDot } from "@/components/platforms/platform-badge";
import { useErrorText } from "@/components/forms/use-action";
import { cn } from "@/lib/utils";
import { ScheduleFormDialog, type DialogState, type ScheduleFormOptions } from "./schedule-form-dialog";

export type ScheduleView = "month" | "week" | "list";

const STATUS_ICON = { scheduled: Clock, published: CheckCircle2, late: AlertTriangle, cancelled: XCircle } as const;

function Chip({ e, onOpen, draggable, compact = false }: { e: ScheduleEntry; onOpen: () => void; draggable: boolean; compact?: boolean }) {
  const t = useTranslations();
  const Icon = STATUS_ICON[e.effective];
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={(ev) => ev.dataTransfer.setData("text/plain", e.id)}
      onClick={onOpen}
      title={`${e.creative_title} · ${e.platform_name} · ${t(`schedule.status.${e.effective}`)}`}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-md border px-1.5 py-1 text-start text-[11px] leading-4 transition hover:shadow-sm",
        e.effective === "late" ? "border-destructive/40 bg-destructive/10" : e.effective === "published" ? "border-success/30 bg-success/10" : e.effective === "cancelled" ? "bg-muted text-muted-foreground line-through" : "bg-card",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
    >
      <Icon className={cn("size-3 shrink-0", e.effective === "late" ? "text-destructive" : e.effective === "published" ? "text-success" : "text-muted-foreground")} aria-label={t(`schedule.status.${e.effective}`)} />
      <PlatformDot name={e.platform_name} className="size-2" />
      {e.scheduled_time && <span className="num shrink-0 text-muted-foreground" dir="ltr">{e.scheduled_time}</span>}
      <span className={cn("min-w-0 flex-1", compact ? "truncate" : "line-clamp-2")}>{e.creative_title}</span>
    </button>
  );
}

export function ScheduleCalendar({
  entries,
  view,
  anchor,
  today,
  options,
  canManage,
  canPublish,
  defaultOwner,
  fixedCompanyId,
}: {
  entries: ScheduleEntry[];
  view: ScheduleView;
  anchor: string;
  today: string;
  options: ScheduleFormOptions;
  canManage: boolean;
  canPublish: boolean;
  defaultOwner?: string;
  fixedCompanyId?: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const errorText = useErrorText();
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [, start] = useTransition();
  const [items, move] = useOptimistic(entries, (s, { id, date }: { id: string; date: string }) => s.map((e) => (e.id === id ? { ...e, scheduled_date: date, effective: e.effective === "late" && date >= today ? ("scheduled" as const) : e.effective } : e)));
  const byDay = new Map<string, ScheduleEntry[]>();
  for (const e of items) (byDay.get(e.scheduled_date) ?? byDay.set(e.scheduled_date, []).get(e.scheduled_date)!).push(e);

  const dayFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { weekday: "short", timeZone: "UTC" });
  const longFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const weekdays = Array.from({ length: 7 }, (_, i) => dayFmt.format(new Date(`${addDays(weekStart(today), i)}T00:00:00Z`)));
  const open = (e: ScheduleEntry) => setDialog({ entry: e });

  const drop = (date: string, id: string) => {
    setOver(null);
    const e = items.find((x) => x.id === id);
    if (!e || e.scheduled_date === date || !canManage) return;
    start(async () => {
      move({ id, date });
      const res = await rescheduleEntry(id, date);
      if (res.ok) toast.success(t("schedule.moved", { date }));
      else toast.error(errorText(res.error));
      router.refresh();
    });
  };
  const dropProps = (date: string) =>
    canManage
      ? {
          onDragOver: (ev: React.DragEvent) => {
            ev.preventDefault();
            setOver(date);
          },
          onDragLeave: () => setOver((o) => (o === date ? null : o)),
          onDrop: (ev: React.DragEvent) => {
            ev.preventDefault();
            drop(date, ev.dataTransfer.getData("text/plain"));
          },
        }
      : {};

  const addBtn = (date: string) =>
    canManage ? (
      <button type="button" onClick={() => setDialog({ date })} className="rounded p-0.5 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground focus:opacity-100 group-hover:opacity-100" aria-label={`${t("schedule.add")} ${date}`}>
        <Plus className="size-3.5" />
      </button>
    ) : null;

  const agenda = (days: string[]) => (
    <ol className="space-y-4">
      {days.filter((d) => byDay.get(d)?.length).map((d) => (
        <li key={d}>
          <h3 className={cn("mb-2 text-sm font-semibold", d === today && "text-brand-accent")}>
            {longFmt.format(new Date(`${d}T00:00:00Z`))} {d === today && <span className="text-xs font-normal">({t("schedule.today")})</span>}
          </h3>
          <ul className="space-y-1.5">
            {byDay.get(d)!.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => open(e)} className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-start text-sm hover:shadow-sm">
                  {(() => {
                    const Icon = STATUS_ICON[e.effective];
                    return <Icon className={cn("size-4 shrink-0", e.effective === "late" ? "text-destructive" : e.effective === "published" ? "text-success" : "text-muted-foreground")} />;
                  })()}
                  <span className="num w-12 shrink-0 text-muted-foreground" dir="ltr">{e.scheduled_time || "—"}</span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate font-medium", e.effective === "cancelled" && "line-through")}>{e.creative_title}</span>
                    <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground"><PlatformDot name={e.platform_name} className="size-2" />{e.platform_name} · {e.company_name}{e.owner_name && ` · ${e.owner_name}`}</span>
                  </span>
                  <span className={cn("hidden shrink-0 rounded-full px-2 py-0.5 text-xs sm:inline", e.effective === "late" ? "bg-destructive/10 text-destructive" : e.effective === "published" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>{t(`schedule.status.${e.effective}`)}</span>
                </button>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );

  let body: React.ReactNode;
  if (view === "list") {
    const days = [...byDay.keys()].sort();
    body = days.length ? agenda(days) : <p className="rounded-xl border bg-card py-12 text-center text-sm text-muted-foreground">{t("schedule.emptyRange")}</p>;
  } else if (view === "week") {
    const ws = weekStart(anchor);
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    body = (
      <>
        <div className="hidden grid-cols-7 gap-2 md:grid">
          {days.map((d, i) => (
            <section key={d} {...dropProps(d)} className={cn("group flex min-h-72 flex-col rounded-xl border bg-card", d === today && "border-brand-accent", over === d && "bg-brand-accent/10")}>
              <header className="flex items-center justify-between border-b px-2 py-1.5">
                <span className="text-xs text-muted-foreground">{weekdays[i]}</span>
                <span className={cn("num text-sm font-semibold", d === today && "rounded-full bg-brand-accent px-1.5 text-brand-primary")}>{Number(d.slice(8))}</span>
                {addBtn(d)}
              </header>
              <div className="flex flex-1 flex-col gap-1 p-1.5">{(byDay.get(d) ?? []).map((e) => <Chip key={e.id} e={e} onOpen={() => open(e)} draggable={canManage} />)}</div>
            </section>
          ))}
        </div>
        <div className="md:hidden">{days.some((d) => byDay.get(d)?.length) ? agenda(days) : <p className="py-10 text-center text-sm text-muted-foreground">{t("schedule.emptyRange")}</p>}</div>
      </>
    );
  } else {
    const grid = monthGrid(anchor);
    const month = anchor.slice(0, 7);
    body = (
      <>
        <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
          <div className="grid grid-cols-7 border-b bg-muted/40">{weekdays.map((w) => <div key={w} className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{w}</div>)}</div>
          <div className="grid grid-cols-7">
            {grid.map((d) => {
              const list = byDay.get(d) ?? [];
              return (
                <div key={d} {...dropProps(d)} className={cn("group min-h-28 border-b border-e p-1 [&:nth-child(7n)]:border-e-0", d.slice(0, 7) !== month && "bg-muted/30 text-muted-foreground", over === d && "bg-brand-accent/10")}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className={cn("num inline-flex size-6 items-center justify-center rounded-full text-xs", d === today && "bg-brand-accent font-semibold text-brand-primary")}>{Number(d.slice(8))}</span>
                    {addBtn(d)}
                  </div>
                  <div className="space-y-1">
                    {list.slice(0, 3).map((e) => <Chip key={e.id} e={e} onOpen={() => open(e)} draggable={canManage} compact />)}
                    {list.length > 3 && <Link href={`?view=week&date=${d}`} className="block px-1 text-[11px] text-muted-foreground hover:text-foreground hover:underline">{t("schedule.more", { n: list.length - 3 })}</Link>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="md:hidden">{grid.some((d) => d.slice(0, 7) === month && byDay.get(d)?.length) ? agenda(grid.filter((d) => d.slice(0, 7) === month)) : <p className="py-10 text-center text-sm text-muted-foreground">{t("schedule.emptyRange")}</p>}</div>
      </>
    );
  }

  return (
    <>
      {body}
      <ScheduleFormDialog state={dialog} onClose={() => setDialog(null)} options={options} canManage={canManage} canPublish={canPublish} defaultOwner={defaultOwner} fixedCompanyId={fixedCompanyId} />
    </>
  );
}
