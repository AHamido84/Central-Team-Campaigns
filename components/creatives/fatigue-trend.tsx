"use client";
import { useLocale, useTranslations } from "next-intl";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber, formatPercent } from "@/lib/format";

type Point = { date: string; ctr: number | null; frequency: number | null };
const AXIS = { stroke: "var(--chart-axis)", fontSize: 11, tickLine: false, axisLine: false } as const;

/** Link CTR and frequency as two small charts on one time axis (synced hover). */
export function FatigueTrend({ data, freqLimit }: { data: Point[]; freqLimit: number }) {
  const t = useTranslations();
  const locale = useLocale();
  const charts = [
    { key: "ctr" as const, label: t("metrics.link_ctr"), color: "var(--series-1)", fmt: (v: number) => formatPercent(v, locale), axis: (v: number) => `${formatNumber(v * 100, locale, 1)}%` },
    { key: "frequency" as const, label: t("metrics.frequency"), color: "var(--series-2)", fmt: (v: number) => formatNumber(v, locale, 2), axis: (v: number) => formatNumber(v, locale, 1) },
  ];
  return (
    <div dir="ltr" className="space-y-1">
      {charts.map((c, i) => (
        <div key={c.key}>
          <p className="text-xs font-medium text-muted-foreground" dir="auto">{c.label}</p>
          <div className="h-28">
            <ResponsiveContainer>
              <LineChart data={data} syncId="fatigue" margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="date" {...AXIS} tickFormatter={(d: string) => d.slice(5).replace("-", "/")} minTickGap={24} hide={i === 0} />
                <YAxis {...AXIS} width={44} tickFormatter={c.axis} domain={["auto", "auto"]} />
                {c.key === "frequency" && <ReferenceLine y={freqLimit} stroke="var(--chart-axis)" strokeDasharray="4 4" />}
                <Tooltip
                  cursor={{ stroke: "var(--chart-axis)", strokeDasharray: "3 3" }}
                  content={({ active, payload, label }) =>
                    active && payload?.length && payload[0].value != null ? (
                      <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-soft">
                        <p className="num text-muted-foreground">{label}</p>
                        <p className="flex items-center gap-2"><span className="size-2.5 rounded-sm" style={{ background: c.color }} />{c.label}<span className="num ms-auto ps-3 font-semibold">{c.fmt(Number(payload[0].value))}</span></p>
                      </div>
                    ) : null
                  }
                />
                <Line type="monotone" dataKey={c.key} stroke={c.color} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls activeDot={{ r: 4, strokeWidth: 2, stroke: "rgb(var(--card))" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}
