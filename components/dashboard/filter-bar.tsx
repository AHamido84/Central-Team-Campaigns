"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PRESETS, type Filters } from "@/lib/filters";
import { CAMPAIGN_STATUS } from "@/types/entities";

type Opt = { id: string; name: string };
export interface FilterOptions {
  companies: Opt[];
  platforms: Opt[];
  buyers: Opt[];
}

/** One row of filters above the charts. Every change is written to the URL so views can be shared. */
export function FilterBar({ filters, options, hideCompany = false, minimal = false, keep = [] }: { filters: Filters; options: FilterOptions; hideCompany?: boolean; minimal?: boolean; keep?: string[] }) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (patch.range && patch.range !== "custom") {
      next.delete("from");
      next.delete("to");
    }
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };
  const reset = () => {
    const next = new URLSearchParams();
    for (const k of keep) if (sp.get(k)) next.set(k, sp.get(k)!);
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };
  const active = filters.preset !== "last_30" || !filters.compare || filters.platform || filters.buyer || filters.status || (!hideCompany && filters.company);

  return (
    <div className="sticky top-16 z-20 -mx-4 mb-5 border-b bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8" aria-busy={pending}>
      <div className="flex flex-wrap items-center gap-2">
        <Select aria-label={t("filters.range")} value={filters.preset} onChange={(e) => set({ range: e.target.value })} className="h-9 w-36">
          {PRESETS.map((p) => <option key={p} value={p}>{t(`filters.preset.${p}`)}</option>)}
        </Select>
        {filters.preset === "custom" && (
          <div className="flex items-center gap-1" dir="ltr">
            <Input type="date" aria-label={t("filters.from")} value={filters.from} max={filters.to} onChange={(e) => set({ range: "custom", from: e.target.value, to: filters.to })} className="num h-9 w-36" />
            <span className="text-muted-foreground">–</span>
            <Input type="date" aria-label={t("filters.to")} value={filters.to} min={filters.from} onChange={(e) => set({ range: "custom", from: filters.from, to: e.target.value })} className="num h-9 w-36" />
          </div>
        )}
        {!hideCompany && options.companies.length > 1 && (
          <Select aria-label={t("filters.company")} value={filters.company} onChange={(e) => set({ company: e.target.value })} className="h-9 w-44">
            <option value="">{t("filters.allCompanies")}</option>
            {options.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        )}
        {!minimal && (
          <>
        <Select aria-label={t("filters.platform")} value={filters.platform} onChange={(e) => set({ platform: e.target.value })} className="h-9 w-36">
          <option value="">{t("filters.allPlatforms")}</option>
          {options.platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        {options.buyers.length > 1 && (
          <Select aria-label={t("filters.buyer")} value={filters.buyer} onChange={(e) => set({ buyer: e.target.value })} className="h-9 w-40">
            <option value="">{t("filters.allBuyers")}</option>
            {options.buyers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        )}
        <Select aria-label={t("filters.status")} value={filters.status} onChange={(e) => set({ status: e.target.value })} className="h-9 w-36">
          <option value="">{t("filters.allStatuses")}</option>
          {CAMPAIGN_STATUS.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
        </Select>
          </>
        )}
        <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 text-sm">
          <input type="checkbox" className="size-4 accent-[rgb(var(--brand-accent))]" checked={filters.compare} onChange={(e) => set({ compare: e.target.checked ? "" : "0" })} />
          {t("filters.compare")}
        </label>
        {active && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw />
            {t("filters.reset")}
          </Button>
        )}
        {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label={t("common.loading")} />}
      </div>
    </div>
  );
}
