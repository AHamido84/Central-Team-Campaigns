"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Columns3, LayoutGrid, Loader2, Search, Trophy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CREATIVE_STATUS, CREATIVE_TYPES } from "@/types/entities";
import { VIEWS, type View } from "@/lib/creative-views";


export function CreativesToolbar({ view, options, hideCompany = false }: { view: View; options: { companies: { id: string; name: string }[]; campaigns: { id: string; name: string; company_id: string }[]; designers: string[] }; hideCompany?: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const get = (k: string) => sp.get(k) ?? "";

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if ("company" in patch) next.delete("campaign");
    start(() => router.replace(`${pathname}?${next}`, { scroll: false }));
  };
  // Debounced search.
  useEffect(() => {
    if (q === (sp.get("q") ?? "")) return;
    const id = setTimeout(() => set({ q }), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const href = (v: View) => {
    const next = new URLSearchParams(sp.toString());
    next.set("view", v);
    return `${pathname}?${next}`;
  };
  const icons = { gallery: LayoutGrid, board: Columns3, leaderboard: Trophy };
  const company = get("company");
  const campaigns = options.campaigns.filter((c) => !company || c.company_id === company);

  return (
    <div className="mb-5 space-y-3">
      <div className="inline-flex rounded-lg border bg-card p-1" role="tablist">
        {VIEWS.map((v) => {
          const Icon = icons[v];
          return (
            <Link key={v} href={href(v)} role="tab" aria-selected={view === v} scroll={false} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="size-4" />
              {t(`creatives.view.${v}`)}
            </Link>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {view !== "leaderboard" && (
          <div className="relative w-full sm:w-60">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("creatives.search")} aria-label={t("common.search")} className="h-9 ps-9" />
          </div>
        )}
        {!hideCompany && options.companies.length > 1 && (
          <Select aria-label={t("filters.company")} value={company} onChange={(e) => set({ company: e.target.value })} className="h-9 w-44">
            <option value="">{t("filters.allCompanies")}</option>
            {options.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        )}
        {view !== "leaderboard" ? (
          <>
            <Select aria-label={t("creatives.f.campaign_id")} value={get("campaign")} onChange={(e) => set({ campaign: e.target.value })} className="h-9 w-48">
              <option value="">{t("creatives.allCampaigns")}</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            {view === "gallery" && (
              <Select aria-label={t("filters.status")} value={get("status")} onChange={(e) => set({ status: e.target.value })} className="h-9 w-36">
                <option value="">{t("creatives.allStatuses")}</option>
                {CREATIVE_STATUS.map((s) => <option key={s} value={s}>{t(`creatives.status.${s}`)}</option>)}
              </Select>
            )}
            <Select aria-label={t("creatives.f.type")} value={get("type")} onChange={(e) => set({ type: e.target.value })} className="h-9 w-32">
              <option value="">{t("creatives.allTypes")}</option>
              {CREATIVE_TYPES.map((s) => <option key={s} value={s}>{t(`creatives.type.${s}`)}</option>)}
            </Select>
            {options.designers.length > 0 && (
              <Select aria-label={t("creatives.f.designer")} value={get("designer")} onChange={(e) => set({ designer: e.target.value })} className="h-9 w-40">
                <option value="">{t("creatives.allDesigners")}</option>
                {options.designers.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            )}
          </>
        ) : (
          <>
            <Select aria-label={t("filters.range")} value={get("range") || "last_30"} onChange={(e) => set({ range: e.target.value })} className="h-9 w-36">
              {["last_7", "last_30", "this_month"].map((p) => <option key={p} value={p}>{t(`filters.preset.${p}`)}</option>)}
            </Select>
            <Select aria-label={t("creatives.rankBy")} value={get("metric") || "cpr"} onChange={(e) => set({ metric: e.target.value })} className="h-9 w-44">
              {["cpr", "ctr", "hook", "hold", "roas"].map((m) => <option key={m} value={m}>{t("creatives.rankBy")}: {t(`creatives.metric.${m}`)}</option>)}
            </Select>
          </>
        )}
        {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>
    </div>
  );
}
