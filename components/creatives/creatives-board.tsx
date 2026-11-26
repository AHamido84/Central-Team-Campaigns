"use client";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { setCreativeStatus } from "@/lib/actions/creatives";
import type { CreativeRow } from "@/lib/data/creatives";
import { useErrorText } from "@/components/forms/use-action";
import { cn } from "@/lib/utils";
import type { CreativeStatus } from "@/types/entities";
import { CreativeThumb } from "./creative-thumb";
import { FatigueBadge } from "./badges";

const COLUMNS: CreativeStatus[] = ["idea", "in_progress", "review", "revisions", "approved", "live", "paused"];

export interface BoardPerms {
  manage: boolean;
  approve: boolean;
  launch: boolean;
}

/** Which columns this user may move a card into (the server checks again). */
function allowed(p: BoardPerms, c: CreativeRow, to: CreativeStatus) {
  if (to === c.status) return false;
  if (to === "approved") return p.approve;
  if (to === "live" || to === "paused") return p.launch && !!c.approved_by;
  return p.manage;
}

export function CreativesBoard({ rows, perms }: { rows: CreativeRow[]; perms: BoardPerms }) {
  const t = useTranslations();
  const router = useRouter();
  const errorText = useErrorText();
  const [, start] = useTransition();
  const [items, move] = useOptimistic(rows, (state, { id, status }: { id: string; status: CreativeStatus }) => state.map((c) => (c.id === id ? { ...c, status } : c)));
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<CreativeStatus | null>(null);

  const moveTo = (c: CreativeRow, status: CreativeStatus) => {
    if (!allowed(perms, c, status)) {
      toast.error(status === "live" || status === "paused" ? (c.approved_by ? errorText("forbidden") : errorText("notApproved")) : errorText("forbidden"));
      return;
    }
    start(async () => {
      move({ id: c.id, status });
      const res = await setCreativeStatus(c.id, status);
      if (!res.ok) toast.error(errorText(res.error));
      else toast.success(t("creatives.moved", { status: t(`creatives.status.${status}`) }));
      router.refresh();
    });
  };

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex min-w-max gap-3">
        {COLUMNS.map((col) => {
          const cards = items.filter((c) => c.status === col);
          return (
            <section
              key={col}
              aria-label={t(`creatives.status.${col}`)}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(col);
              }}
              onDragLeave={() => setOver((o) => (o === col ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                setDragId(null);
                const c = items.find((x) => x.id === (e.dataTransfer.getData("text/plain") || dragId));
                if (c) moveTo(c, col);
              }}
              className={cn("flex w-64 shrink-0 flex-col rounded-xl border bg-muted/40 transition-colors", over === col && "border-brand-accent bg-brand-accent/10")}
            >
              <header className="flex items-center justify-between px-3 py-2.5">
                <h3 className="text-sm font-semibold">{t(`creatives.status.${col}`)}</h3>
                <span className="num rounded-full bg-card px-2 text-xs text-muted-foreground">{cards.length}</span>
              </header>
              <ul className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
                {cards.map((c) => (
                  <li
                    key={c.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", c.id);
                      setDragId(c.id);
                    }}
                    onDragEnd={() => setDragId(null)}
                    className={cn("cursor-grab overflow-hidden rounded-lg border bg-card shadow-sm active:cursor-grabbing", dragId === c.id && "opacity-50")}
                  >
                    <div className="flex gap-2 p-2">
                      <CreativeThumb c={c} className="size-14 shrink-0 rounded-md" />
                      <div className="min-w-0 flex-1">
                        <Link href={`/creatives/${c.id}`} className="line-clamp-2 text-xs font-medium leading-4 hover:underline">{c.title}</Link>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{c.company_name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <span className="rounded bg-muted px-1.5 text-[10px]">{t(`creatives.type.${c.type}`)}</span>
                          {c.fatigue !== "healthy" && <FatigueBadge level={c.fatigue} className="px-1.5 py-0 text-[10px]" />}
                        </div>
                      </div>
                    </div>
                    <label className="flex items-center gap-1 border-t px-2 py-1 text-[11px] text-muted-foreground">
                      <span className="shrink-0">{t("creatives.moveTo")}</span>
                      <select
                        className="min-w-0 flex-1 bg-transparent py-0.5 text-foreground focus:outline-none"
                        value=""
                        onChange={(e) => e.target.value && moveTo(c, e.target.value as CreativeStatus)}
                        aria-label={`${t("creatives.moveTo")}: ${c.title}`}
                      >
                        <option value="">…</option>
                        {COLUMNS.filter((s) => allowed(perms, c, s)).map((s) => <option key={s} value={s}>{t(`creatives.status.${s}`)}</option>)}
                      </select>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
