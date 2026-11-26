"use client";

import { useLocale, useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompact, formatCurrency, formatNumber } from "@/lib/format";

const AXIS = { stroke: "var(--chart-axis)", fontSize: 11, tickLine: false, axisLine: false } as const;
const series = (n: number) => `var(--series-${n})`;

function TipBox({ title, rows }: { title?: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-soft">
      {title && <p className="num mb-1 font-medium text-muted-foreground" dir="ltr">{title}</p>}
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2">
          {r.color && <span className="size-2.5 rounded-sm" style={{ background: r.color }} />}
          <span className="text-muted-foreground">{r.label}</span>
          <span className="num ms-auto ps-3 font-semibold">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

const shortDate = (d: string) => d.slice(5).replace("-", "/");

export interface DailyPoint {
  date: string;
  spend: number;
  results: number;
}

/**
 * Daily spend and daily results as two stacked charts sharing one time axis
 * and one synced hover (instead of a dual-axis chart, which misleads).
 */
export function DailyCharts({ data, currency }: { data: DailyPoint[]; currency: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const common = { data, syncId: "daily", margin: { top: 8, right: 8, bottom: 0, left: 0 } };
  const tip = (key: "spend" | "results") =>
    function Tip({ active, payload, label }: { active?: boolean; payload?: { value?: number }[]; label?: string }) {
      if (!active || !payload?.length) return null;
      const v = Number(payload[0].value ?? 0);
      return <TipBox title={label} rows={[{ label: t(`metrics.${key}`), value: key === "spend" ? formatCurrency(v, currency, locale, 0) : formatNumber(v, locale), color: series(key === "spend" ? 1 : 3) }]} />;
    };
  return (
    <div dir="ltr" className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground" dir="auto">{t("metrics.spend")}</p>
      <div className="h-40">
        <ResponsiveContainer>
          <AreaChart {...common}>
            <defs>
              <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={series(1)} stopOpacity={0.25} />
                <stop offset="100%" stopColor={series(1)} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="date" {...AXIS} tickFormatter={shortDate} minTickGap={24} hide />
            <YAxis {...AXIS} width={44} tickFormatter={(v) => formatCompact(v, locale)} />
            <Tooltip content={tip("spend")} cursor={{ stroke: "var(--chart-axis)", strokeDasharray: "3 3" }} />
            <Area type="monotone" dataKey="spend" stroke={series(1)} strokeWidth={2} fill="url(#spendFill)" isAnimationActive={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "rgb(var(--card))" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="pt-2 text-xs font-medium text-muted-foreground" dir="auto">{t("metrics.results")}</p>
      <div className="h-36">
        <ResponsiveContainer>
          <LineChart {...common}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="date" {...AXIS} tickFormatter={shortDate} minTickGap={24} />
            <YAxis {...AXIS} width={44} allowDecimals={false} tickFormatter={(v) => formatCompact(v, locale)} />
            <Tooltip content={tip("results")} cursor={{ stroke: "var(--chart-axis)", strokeDasharray: "3 3" }} />
            <Line type="monotone" dataKey="results" stroke={series(3)} strokeWidth={2} dot={false} isAnimationActive={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "rgb(var(--card))" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export interface Slice {
  id: string;
  name: string;
  spend: number;
  slot: number;
}

/** Folds anything beyond 7 entries into "Other" so no generated 9th color is ever needed. */
function fold(rows: Slice[], other: string): Slice[] {
  if (rows.length <= 8) return rows;
  const rest = rows.slice(7).reduce((s, r) => s + r.spend, 0);
  return [...rows.slice(0, 7), { id: "_other", name: other, spend: rest, slot: 8 }];
}

export function SpendDonut({ data, currency }: { data: Slice[]; currency: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const rows = fold(data, t("common.other"));
  const total = rows.reduce((s, r) => s + r.spend, 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative size-44 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={rows} dataKey="spend" nameKey="name" innerRadius="62%" outerRadius="100%" paddingAngle={rows.length > 1 ? 2 : 0} stroke="rgb(var(--card))" strokeWidth={2} isAnimationActive={false}>
              {rows.map((r) => <Cell key={r.id} fill={series(r.slot)} />)}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <TipBox rows={[{ label: String(payload[0].name), value: `${formatCurrency(Number(payload[0].value), currency, locale, 0)} · ${formatNumber((Number(payload[0].value) / total) * 100, locale, 1)}%`, color: series((payload[0].payload as Slice).slot) }]} />
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-muted-foreground">{t("metrics.spend")}</span>
          <span className="num text-sm font-semibold">{formatCompact(total, locale)}</span>
        </div>
      </div>
      <ul className="w-full space-y-1.5 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: series(r.slot) }} />
            <span className="truncate">{r.name}</span>
            <span className="num ms-auto text-muted-foreground">{total ? formatNumber((r.spend / total) * 100, locale, 0) : 0}%</span>
            <span className="num w-24 text-end font-medium">{formatCurrency(r.spend, currency, locale, 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal bars, one color, drawn in HTML so they read naturally in RTL. Bars are compared by length. */
export function SpendBars({ data, currency }: { data: Slice[]; currency: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const rows = fold(data, t("common.other"));
  const max = Math.max(...rows.map((r) => r.spend), 1);
  const total = rows.reduce((s, r) => s + r.spend, 0);
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id} className="group" title={`${r.name}: ${formatCurrency(r.spend, currency, locale, 0)}`}>
          <div className="mb-1 flex items-baseline gap-2 text-sm">
            <span className="truncate font-medium">{r.name}</span>
            <span className="num ms-auto text-xs text-muted-foreground">{total ? formatNumber((r.spend / total) * 100, locale, 0) : 0}%</span>
            <span className="num w-24 text-end font-medium">{formatCurrency(r.spend, currency, locale, 0)}</span>
          </div>
          <div className="h-3 rounded-e bg-muted/60">
            <div className="h-full rounded-e transition-opacity group-hover:opacity-80" style={{ width: `${(r.spend / max) * 100}%`, background: series(1) }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
