import { APP_TIME_ZONE } from "@/i18n/config";

/** YYYY-MM-DD for "now" in the app time zone (Asia/Riyadh by default). */
export function todayISO(tz = APP_TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function monthStart(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function daysInMonth(iso: string): number {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function diffDays(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

export const inRange = (d: string, from: string, to: string) => d >= from && d <= to;

/** Day of week, 0 = Sunday. */
export const weekday = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();

/** Weeks start on Sunday (Saudi work week). */
export const weekStart = (iso: string) => addDays(iso, -weekday(iso));

export function addMonths(iso: string, n: number): string {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 10);
}

/** The 6x7 grid of days shown for the month that contains iso. */
export function monthGrid(iso: string): string[] {
  const start = weekStart(monthStart(iso));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
