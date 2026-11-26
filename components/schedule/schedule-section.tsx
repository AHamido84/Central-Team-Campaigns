import { getLocale } from "next-intl/server";
import { can, hasPermission, type AuthUser } from "@/lib/auth/permissions";
import { listSchedule, scheduleOptions } from "@/lib/data/schedule";
import { addDays, monthGrid, todayISO, weekStart } from "@/lib/dates";
import type { SearchParams } from "@/lib/filters";
import { ScheduleCalendar, type ScheduleView } from "./schedule-calendar";
import { ScheduleToolbar } from "./schedule-toolbar";
import { AddScheduleButton } from "./add-schedule-button";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function ScheduleSection({ user, sp, fixedCompanyId }: { user: AuthUser; sp: SearchParams; fixedCompanyId?: string }) {
  const locale = await getLocale();
  const today = todayISO();
  const view: ScheduleView = (["month", "week", "list"] as const).find((v) => v === one(sp.view)) ?? "month";
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(one(sp.date)) ? one(sp.date) : today;
  const range =
    view === "week"
      ? { from: weekStart(anchor), to: addDays(weekStart(anchor), 6) }
      : view === "list"
        ? { from: addDays(anchor, -7), to: addDays(anchor, 30) }
        : { from: monthGrid(anchor)[0], to: monthGrid(anchor)[41] };
  const company = fixedCompanyId ?? one(sp.company);
  const [entries, options] = await Promise.all([
    listSchedule(user, { ...range, company, platform: one(sp.platform), status: one(sp.status), owner: one(sp.owner) }, locale),
    scheduleOptions(user, locale),
  ]);
  const canManage = company ? can(user, "schedule:manage", company) : hasPermission(user, "schedule:manage");
  const canPublish = canManage || hasPermission(user, "campaign:manage");
  const defaultOwner = user.role === "Viewer" ? undefined : user.email;
  return (
    <div>
      <ScheduleToolbar
        view={view}
        anchor={anchor}
        options={options}
        hideCompany={!!fixedCompanyId}
        action={canManage ? <AddScheduleButton options={options} defaultOwner={defaultOwner} fixedCompanyId={fixedCompanyId} canPublish={canPublish} date={anchor >= today ? anchor : today} /> : undefined}
      />
      <ScheduleCalendar entries={entries} view={view} anchor={anchor} today={today} options={options} canManage={canManage} canPublish={canPublish} defaultOwner={defaultOwner} fixedCompanyId={fixedCompanyId} />
    </div>
  );
}
