"use client";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Building2, CalendarRange, Layers, Loader2, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PRESETS } from "@/lib/filters";
import { REPORT_SECTIONS, reportQuery, type ReportParams, type ReportType } from "@/lib/reports/params";
import { cn } from "@/lib/utils";

const ICONS: Record<ReportType, typeof Layers> = { consolidated: Layers, company: Building2, buyer: UserRound };

export function ReportBuilder({ p, companies, buyers, types }: { p: ReportParams; companies: { id: string; name: string }[]; buyers: { id: string; name: string }[]; types: ReportType[] }) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const go = (next: ReportParams) => start(() => router.replace(`${pathname}?${reportQuery(next)}`, { scroll: false }));
  const set = (patch: Partial<ReportParams>) => go({ ...p, ...patch });
  const presets: { label: string; params: Partial<ReportParams> }[] = [
    { label: t("reports.preset.weekly"), params: { type: "consolidated", company: "", buyer: "", preset: "last_7" } },
    { label: t("reports.preset.monthly"), params: { type: "consolidated", company: "", buyer: "", preset: "last_month" } },
    { label: t("reports.preset.mtd"), params: { type: "consolidated", company: "", buyer: "", preset: "this_month" } },
  ];
  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-soft print:hidden">
      <div className="flex flex-wrap gap-2">
        {presets.map((x) => (
          <button key={x.label} type="button" onClick={() => go({ ...p, ...x.params, sections: [...REPORT_SECTIONS] } as ReportParams)} className="rounded-full border px-3 py-1 text-xs hover:bg-muted">
            {x.label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-[auto_1fr]">
        <div className="inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label={t("reports.reportType")}>
          {types.map((ty) => {
            const Icon = ICONS[ty];
            return (
              <button
                key={ty}
                type="button"
                role="radio"
                aria-checked={p.type === ty}
                onClick={() => set({ type: ty, company: ty === "company" ? p.company || companies[0]?.id || "" : "", buyer: ty === "buyer" ? p.buyer || buyers[0]?.id || "" : "" })}
                className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", p.type === ty ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                <Icon className="size-4" />
                {t(`reports.type.${ty}`)}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {p.type === "company" && (
            <Select aria-label={t("filters.company")} value={p.company} onChange={(e) => set({ company: e.target.value })} className="h-9 w-48">
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          )}
          {p.type === "buyer" && (
            <Select aria-label={t("filters.buyer")} value={p.buyer} onChange={(e) => set({ buyer: e.target.value })} className="h-9 w-48">
              {buyers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          )}
          <CalendarRange className="size-4 text-muted-foreground" />
          <Select aria-label={t("filters.range")} value={p.preset} onChange={(e) => set({ preset: e.target.value as ReportParams["preset"] })} className="h-9 w-40">
            {PRESETS.map((x) => <option key={x} value={x}>{t(`filters.preset.${x}`)}</option>)}
          </Select>
          {p.preset === "custom" && (
            <div className="flex items-center gap-1" dir="ltr">
              <Input type="date" aria-label={t("filters.from")} value={p.from} max={p.to} onChange={(e) => set({ from: e.target.value })} className="num h-9 w-36" />
              <span className="text-muted-foreground">–</span>
              <Input type="date" aria-label={t("filters.to")} value={p.to} min={p.from} onChange={(e) => set({ to: e.target.value })} className="num h-9 w-36" />
            </div>
          )}
          <label className="flex h-9 items-center gap-2 rounded-lg border px-3 text-sm">
            <input type="checkbox" className="size-4" checked={p.compare} onChange={(e) => set({ compare: e.target.checked })} />
            {t("filters.compare")}
          </label>
          {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
      </div>
      <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3">
        <legend className="sr-only">{t("reports.sectionsLabel")}</legend>
        <span className="text-xs text-muted-foreground">{t("reports.sectionsLabel")}:</span>
        {REPORT_SECTIONS.map((s) => (
          <label key={s} className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" className="size-4" checked={p.sections.includes(s)} onChange={(e) => set({ sections: e.target.checked ? REPORT_SECTIONS.filter((x) => x === s || p.sections.includes(x)) : p.sections.filter((x) => x !== s) })} />
            {t(`reports.sections.${s}`, { month: "" })}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
