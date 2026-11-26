import { Palette, Plus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { can, hasPermission, type AuthUser } from "@/lib/auth/permissions";
import { creativeFilterOptions, leaderboard, LEADERBOARD_METRICS, listCreatives, type LeaderboardMetric } from "@/lib/data/creatives";
import { parseFilters, type SearchParams } from "@/lib/filters";
import { CreativeFormDialog } from "./creative-form-dialog";
import { CreativesBoard } from "./creatives-board";
import { CreativesGallery } from "./creatives-gallery";
import { CreativesToolbar } from "./creatives-toolbar";
import { VIEWS, type View } from "@/lib/creative-views";
import { Leaderboard } from "./leaderboard";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Gallery / board / leaderboard, used by /creatives and by the company page (fixedCompanyId). */
export async function CreativesSection({ user, sp, fixedCompanyId, showAdd = true }: { user: AuthUser; sp: SearchParams; fixedCompanyId?: string; showAdd?: boolean }) {
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
  const view: View = (VIEWS as readonly string[]).includes(one(sp.view)) ? (one(sp.view) as View) : "gallery";
  const options = await creativeFilterOptions(user, locale);
  const company = fixedCompanyId ?? one(sp.company);
  const manage = company ? can(user, "creative:manage", company) : hasPermission(user, "creative:manage");
  const formOptions = { ...options, canApprove: hasPermission(user, "creative:approve") };
  const addButton =
    showAdd && manage ? (
      <CreativeFormDialog options={formOptions} fixedCompanyId={fixedCompanyId} defaultDesigner={user.role === "Designer" ? user.name : undefined} trigger={<Button variant="accent"><Plus />{t("creatives.add")}</Button>} />
    ) : null;

  let body: React.ReactNode;
  if (view === "leaderboard") {
    const metric = (LEADERBOARD_METRICS as readonly string[]).includes(one(sp.metric)) ? (one(sp.metric) as LeaderboardMetric) : "cpr";
    const f = parseFilters({ range: one(sp.range) || "last_30" });
    const rows = await leaderboard(user, { from: f.from, to: f.to, company, metric }, locale);
    const currency = options.currency;
    body = rows.length ? (
      <>
        <p className="mb-3 text-xs text-muted-foreground">
          {t("creatives.leaderHint")} <span className="num" dir="ltr">{f.from} → {f.to}</span>
        </p>
        <Leaderboard rows={rows} metric={metric} currency={currency} />
      </>
    ) : (
      <EmptyState icon={Palette} title={t("creatives.leaderEmpty")} body={t("creatives.leaderEmptyBody")} />
    );
  } else {
    const rows = await listCreatives(user, { company, campaign: one(sp.campaign), status: view === "board" ? "" : one(sp.status), type: one(sp.type), designer: one(sp.designer), q: one(sp.q) }, locale);
    const filtered = Boolean(one(sp.campaign) || one(sp.status) || one(sp.type) || one(sp.designer) || one(sp.q) || (!fixedCompanyId && company));
    if (!rows.length) body = <EmptyState icon={Palette} title={filtered ? t("creatives.emptyFiltered") : t("creatives.empty")} body={filtered ? undefined : t("creatives.emptyBody")} action={filtered ? undefined : addButton} />;
    else if (view === "board") body = <CreativesBoard rows={rows} perms={{ manage, approve: hasPermission(user, "creative:approve"), launch: manage || hasPermission(user, "campaign:manage") }} />;
    else body = <CreativesGallery rows={rows} />;
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CreativesToolbar view={view} options={options} hideCompany={!!fixedCompanyId} />
        {addButton}
      </div>
      {body}
    </div>
  );
}
