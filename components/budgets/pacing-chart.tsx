"use client";
import { useLocale, useTranslations } from "next-intl";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompact, formatCurrency } from "@/lib/format";

/** Cumulative spend vs the straight-line plan. Same unit, so one axis. */
export function PacingChart({ data, currency }: { data: { date: string; actual: number | null; plan: number }[]; currency: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const series = [
    { key: "actual" as const, label: t("budgets.cumulative"), color: "var(--series-1)", dash: undefined },
    { key: "plan" as const, label: t("budgets.planLine"), color: "var(--chart-axis)", dash: "5 4" },
  ];
  return (
    <div>
      <ul className="mb-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <svg width="18" height="6" aria-hidden><line x1="0" y1="3" x2="18" y2="3" stroke={s.color} strokeWidth="2" strokeDasharray={s.dash} /></svg>
            {s.label}
          </li>
        ))}
      </ul>
      <div className="h-44" dir="ltr">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="date" stroke="var(--chart-axis)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(d: string) => String(Number(d.slice(8)))} minTickGap={16} />
            <YAxis stroke="var(--chart-axis)" fontSize={11} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => formatCompact(v, locale)} />
            <Tooltip
              cursor={{ stroke: "var(--chart-axis)", strokeDasharray: "3 3" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-soft">
                    <p className="num mb-1 text-muted-foreground">{label}</p>
                    {series.map((s) => {
                      const p = payload.find((x) => x.dataKey === s.key);
                      return p && p.value != null ? (
                        <p key={s.key} className="flex items-center gap-2">
                          <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
                          <span className="text-muted-foreground">{s.label}</span>
                          <span className="num ms-auto ps-3 font-semibold">{formatCurrency(Number(p.value), currency, locale, 0)}</span>
                        </p>
                      ) : null;
                    })}
                  </div>
                ) : null
              }
            />
            <Line type="linear" dataKey="plan" stroke="var(--chart-axis)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="actual" stroke="var(--series-1)" strokeWidth={2} dot={false} isAnimationActive={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "rgb(var(--card))" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
