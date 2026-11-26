import Link from "next/link";
import { Pencil, Target, Wallet } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { PlatformDot } from "@/components/platforms/platform-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { can, type AuthUser } from "@/lib/auth/permissions";
import { budgetOverview, type CompanyPlan } from "@/lib/data/budgets";
import { todayISO } from "@/lib/dates";
import type { SearchParams } from "@/lib/filters";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MonthNav } from "./month-nav";
import { PacingChart } from "./pacing-chart";
import { PlanDialog } from "./plan-dialog";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

type State = "over" | "fast" | "slow" | "ok" | "none";
/** Over: already past budget. Fast/slow: projected month-end more than 10% above / 20% below plan. */
function stateOf(planned: number, spent: number, projected: number): State {
  if (planned <= 0) return "none";
  if (spent > planned) return "over";
  if (projected > planned * 1.1) return "fast";
  if (projected < planned * 0.8) return "slow";
  return "ok";
}
const STATE_STYLE: Record<State, string> = { over: "text-destructive", fast: "text-warning", slow: "text-sky-700 dark:text-sky-300", ok: "text-success", none: "text-muted-foreground" };
const BAR: Record<State, string> = { over: "bg-destructive", fast: "bg-warning", slow: "bg-[var(--series-1)]", ok: "bg-success", none: "bg-muted-foreground" };

function Bar({ value, max, state, mark }: { value: number; max: number; state: State; mark?: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="relative h-2 rounded-full bg-muted">
      <div className={cn("h-full rounded-full", BAR[state])} style={{ width: `${pct}%` }} />
      {mark !== undefined && mark > 0 && mark < 1 && <div className="absolute -top-1 h-4 w-0.5 rounded bg-foreground/40" style={{ insetInlineStart: `${mark * 100}%` }} />}
    </div>
  );
}

async function TargetRow({ label, actual, target, fmt, higherIsBetter }: { label: string; actual: number | null; target: number; fmt: (v: number) => string; higherIsBetter: boolean }) {
  const t = await getTranslations();
  if (!target) return null;
  const good = actual === null ? null : higherIsBetter ? actual >= target : actual <= target;
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="num mt-1 text-base font-semibold">
        {actual === null ? "–" : fmt(actual)} <span className="text-xs font-normal text-muted-foreground">/ {fmt(target)}</span>
      </p>
      {good !== null && <p className={cn("text-xs", good ? "text-success" : "text-destructive")}>{good ? t("budgets.onTarget") : t("budgets.offTarget")}</p>}
    </div>
  );
}

async function PlanCard({ p, month, mark, platforms, canEdit, phase }: { p: CompanyPlan; month: string; mark: number; platforms: { id: string; name: string }[]; canEdit: boolean; phase: string }) {
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
  const cur = p.currency;
  const st = stateOf(p.planned, p.spent, p.projected);
  const money = (v: number) => formatCurrency(v, cur, locale, 0);
  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-3">
        <div>
          <Link href={`/companies/${p.id}?tab=budgets`} className="text-base font-semibold hover:underline">{p.name}</Link>
          <p className={cn("text-xs", STATE_STYLE[st])}>{t(`pacing.${st}`)}</p>
        </div>
        {canEdit && (
          <PlanDialog
            companyId={p.id}
            companyName={p.name}
            month={month}
            currency={cur}
            platforms={platforms}
            current={Object.fromEntries(p.lines.map((l) => [l.platform_id, l.planned]))}
            target={p.target}
            locale={locale}
            trigger={<Button variant="outline" size="sm"><Pencil />{t("budgets.edit")}</Button>}
          />
        )}
      </div>
      <div className="space-y-5 px-5 pb-5">
        <div>
          <div className="mb-1.5 flex flex-wrap items-baseline gap-x-3 text-sm">
            <span className="num font-semibold">{money(p.spent)}</span>
            <span className="text-muted-foreground">{t("budgets.of")} <span className="num">{money(p.planned)}</span></span>
            {p.planned > 0 && <span className="num ms-auto text-xs text-muted-foreground">{formatPercent(p.spent / p.planned, locale)}</span>}
          </div>
          <Bar value={p.spent} max={p.planned} state={st} mark={phase === "current" ? mark : undefined} />
          <p className="num mt-1.5 text-xs text-muted-foreground">
            {phase === "current" && <>{t("pacing.projected")} {money(p.projected)} · </>}
            {t("budgets.remaining")} {money(Math.max(0, p.planned - p.spent))}
          </p>
        </div>

        {p.lines.length > 0 && (
          <div className="-mx-5">
            <Table>
              <THead>
                <TR>
                  <TH className="ps-5">{t("filters.platform")}</TH>
                  <TH className="text-end">{t("budgets.planned")}</TH>
                  <TH className="text-end">{t("pacing.spent")}</TH>
                  <TH className="w-28">{t("budgets.used")}</TH>
                  <TH className="pe-5 text-end">{phase === "current" ? t("budgets.projectedShort") : t("budgets.status")}</TH>
                </TR>
              </THead>
              <TBody>
                {p.lines.map((l) => {
                  const s = stateOf(l.planned, l.spent, l.projected);
                  return (
                    <TR key={l.platform_id}>
                      <TD className="ps-5"><span className="flex items-center gap-2"><PlatformDot name={l.platform} />{l.platform}</span></TD>
                      <TD className="num text-end">{l.planned ? money(l.planned) : <span className="text-muted-foreground">{t("budgets.unplanned")}</span>}</TD>
                      <TD className="num text-end">{money(l.spent)}</TD>
                      <TD><Bar value={l.spent} max={l.planned || l.spent} state={s} /></TD>
                      <TD className={cn("num pe-5 text-end", STATE_STYLE[s])}>{phase === "current" ? money(l.projected) : t(`pacing.${s}`)}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>
        )}

        {p.target ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <TargetRow label={t("budgets.f.target_leads")} actual={p.actual.leads} target={p.target.leads} fmt={(v) => formatNumber(v, locale)} higherIsBetter />
            <TargetRow label={t("budgets.f.target_cpl")} actual={p.actual.cpl} target={p.target.cpl} fmt={(v) => formatCurrency(v, cur, locale)} higherIsBetter={false} />
            <TargetRow label={t("budgets.f.target_roas")} actual={p.actual.roas} target={p.target.roas} fmt={(v) => `${formatNumber(v, locale, 2)}x`} higherIsBetter />
            <TargetRow label={t("budgets.f.target_spend")} actual={p.spent} target={p.target.spend} fmt={money} higherIsBetter={false} />
          </div>
        ) : (
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><Target className="size-3.5" />{t("budgets.noTarget")}</p>
        )}

        {p.planned > 0 && phase !== "future" && <PacingChart data={p.daily} currency={cur} />}
      </div>
    </Card>
  );
}

export async function BudgetsSection({ user, sp, fixedCompanyId }: { user: AuthUser; sp: SearchParams; fixedCompanyId?: string }) {
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(one(sp.month)) ? one(sp.month) : todayISO().slice(0, 7);
  const o = await budgetOverview(user, month, locale, fixedCompanyId);
  const editable = o.plans.filter((p) => can(user, "budget:manage", p.id));
  const copyIds = editable.filter((p) => p.planned === 0).map((p) => p.id);
  const currencies = new Set(o.plans.map((p) => p.currency));
  const cur = currencies.size === 1 ? [...currencies][0] : "SAR";
  const sum = (k: "planned" | "spent" | "projected") => o.plans.reduce((s, p) => s + p[k], 0);
  const totals: [string, number][] = [
    [t("budgets.planned"), sum("planned")],
    [t("pacing.spent"), sum("spent")],
    [o.phase === "current" ? t("pacing.projected") : t("budgets.remaining"), o.phase === "current" ? sum("projected") : Math.max(0, sum("planned") - sum("spent"))],
  ];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthNav month={month} copyIds={copyIds} />
        {o.phase === "current" && o.lastDataDay && <p className="text-xs text-muted-foreground">{t("budgets.dataUntil")} <span className="num" dir="ltr">{o.lastDataDay}</span></p>}
      </div>
      {!fixedCompanyId && o.plans.length > 1 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {totals.map(([k, v]) => (
            <Card key={k} className="p-4">
              <p className="text-xs text-muted-foreground">{k}</p>
              <p className="num mt-1 text-2xl font-semibold">{formatCurrency(v, cur, locale, 0)}</p>
            </Card>
          ))}
        </div>
      )}
      {o.plans.length ? (
        <div className={cn("grid gap-4", !fixedCompanyId && "xl:grid-cols-2")}>
          {o.plans.map((p) => <PlanCard key={p.id} p={p} month={month} mark={o.elapsedShare} platforms={o.platforms} canEdit={can(user, "budget:manage", p.id)} phase={o.phase} />)}
        </div>
      ) : (
        <EmptyState icon={Wallet} title={t("budgets.empty")} />
      )}
    </div>
  );
}
