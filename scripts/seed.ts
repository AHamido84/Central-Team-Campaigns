import "./env";
import { getAll, bulkInsert, flushWrites, update, upsertMany } from "../lib/sheets/repository";
import { rowKey } from "../lib/import/row-key";
import { addDays, todayISO } from "../lib/dates";
import { initSheets } from "../lib/sheets/init";

/**
 * Demo data. Phase 1 seeds users, platforms and settings; later phases add
 * companies, campaigns, creatives and 60 days of results.
 * Safe to re-run: it skips tables that already have rows.
 */
const ACTOR = "seed@system";

async function seedIfEmpty<T extends Parameters<typeof bulkInsert>[0]>(table: T, rows: Parameters<typeof bulkInsert<T>>[1]) {
  const existing = await getAll(table, { includeDeleted: true });
  if (existing.length) {
    console.log(`  = ${table}: already has ${existing.length} rows, skipped`);
    return;
  }
  await bulkInsert(table, rows, ACTOR);
  await flushWrites();
  console.log(`  + ${table}: ${rows.length} rows`);
}

async function main() {
  await initSheets(() => {});
  console.log("Seeding demo data...");

  await seedIfEmpty("Platforms", [
    { name: "Meta", icon: "meta", is_active: true },
    { name: "TikTok", icon: "tiktok", is_active: true },
    { name: "Snapchat", icon: "snapchat", is_active: true },
    { name: "Google Ads", icon: "google", is_active: true },
    { name: "X", icon: "x", is_active: false },
    { name: "LinkedIn", icon: "linkedin", is_active: false },
    { name: "YouTube", icon: "youtube", is_active: false },
  ]);

  await seedIfEmpty("Users", [
    { email: "admin@qaswarah.test", name: "مدير النظام", role: "Admin", company_ids: ["*"] },
    { email: "manager@qaswarah.test", name: "سارة المدير", role: "Manager", company_ids: ["*"] },
    { email: "buyer@qaswarah.test", name: "خالد مشتري الإعلانات", role: "MediaBuyer", company_ids: [] },
    { email: "designer@qaswarah.test", name: "نورة المصممة", role: "Designer", company_ids: ["*"] },
    { email: "viewer@qaswarah.test", name: "عميل للعرض فقط", role: "Viewer", company_ids: [] },
  ]);

  await seedIfEmpty("Settings", [
    { key: "default_currency", value: "SAR" },
    { key: "alert_frequency_max", value: "3" },
    { key: "alert_ctr_min", value: "0.008" },
    { key: "alert_cpl_over_target_pct", value: "0.2" },
    { key: "alert_zero_results_days", value: "3" },
    { key: "alert_no_import_days", value: "2" },
  ]);

  await seedCompaniesAndCampaigns();
  await seedResults();
  console.log("Done.");
}

/* ---------- Companies, ad accounts, campaigns, ad sets ---------- */
async function seedCompaniesAndCampaigns() {
  if ((await getAll("Companies", { includeDeleted: true })).length) {
    console.log("  = Companies: already seeded, skipped companies/campaigns");
    return;
  }
  const platforms = await getAll("Platforms");
  const pid = (name: string) => platforms.find((p) => p.name === name)!.id;

  const companies = await bulkInsert(
    "Companies",
    [
      { name_ar: "قسورة للعقارات", name_en: "Qaswarah Real Estate", industry: "عقارات", currency: "SAR", monthly_budget: 60000, status: "active", account_manager: "سارة المدير" },
      { name_ar: "مطاعم الواحة", name_en: "Al Waha Restaurants", industry: "مطاعم", currency: "SAR", monthly_budget: 35000, status: "active", account_manager: "سارة المدير" },
      { name_ar: "عيادات النخبة", name_en: "Elite Clinics", industry: "رعاية صحية", currency: "SAR", monthly_budget: 45000, status: "active", account_manager: "خالد" },
    ],
    ACTOR,
  );
  console.log(`  + Companies: ${companies.length} rows`);

  // Give the demo media buyer and viewer access to the first two companies / the first company.
  const users = await getAll("Users");
  const buyer = users.find((u) => u.email === "buyer@qaswarah.test");
  const viewer = users.find((u) => u.email === "viewer@qaswarah.test");
  if (buyer) await update("Users", buyer.id, { company_ids: [companies[0].id, companies[1].id] }, ACTOR);
  if (viewer) await update("Users", viewer.id, { company_ids: [companies[0].id] }, ACTOR);

  const active = ["Meta", "TikTok", "Snapchat", "Google Ads"];
  const accounts = await bulkInsert(
    "AdAccounts",
    companies.flatMap((c, i) =>
      active.map((p, j) => ({ company_id: c.id, platform_id: pid(p), account_name: `${c.name_en} - ${p}`, external_account_id: `act_${100200300 + i * 10 + j}` })),
    ),
    ACTOR,
  );
  console.log(`  + AdAccounts: ${accounts.length} rows`);
  const acc = (companyId: string, platform: string) => accounts.find((a) => a.company_id === companyId && a.platform_id === pid(platform))?.id ?? "";

  const today = todayISO();
  const plan: [number, string, string, "Leads" | "Sales" | "Awareness" | "Messages" | "Traffic", number, "active" | "paused" | "ended"][] = [
    [0, "Meta", "مشروع الياسمين - عملاء محتملون", "Leads", 900, "active"],
    [0, "Meta", "فلل الربيع - رسائل واتساب", "Messages", 600, "active"],
    [0, "Google Ads", "بحث - شقق للبيع الرياض", "Leads", 500, "active"],
    [0, "TikTok", "جولة افتراضية - وعي", "Awareness", 300, "paused"],
    [1, "Meta", "قائمة الشتاء - طلبات", "Sales", 450, "active"],
    [1, "Snapchat", "عرض نهاية الأسبوع", "Traffic", 350, "active"],
    [1, "TikTok", "تحدي الطبق الجديد", "Awareness", 400, "active"],
    [1, "Google Ads", "بحث - مطعم قريب مني", "Traffic", 250, "ended"],
    [2, "Meta", "تبييض الأسنان - حجوزات", "Leads", 700, "active"],
    [2, "Meta", "استشارة جلدية مجانية", "Messages", 500, "active"],
    [2, "Snapchat", "عروض الليزر", "Leads", 400, "paused"],
    [2, "Google Ads", "بحث - عيادة أسنان", "Leads", 600, "active"],
  ];
  const buyers = ["buyer@qaswarah.test", "manager@qaswarah.test"];
  const campaigns = await bulkInsert(
    "Campaigns",
    plan.map(([ci, p, name, objective, budget, status], k) => ({
      company_id: companies[ci].id,
      platform_id: pid(p),
      ad_account_id: acc(companies[ci].id, p),
      name,
      objective,
      start_date: addDays(today, -75 + k),
      end_date: status === "ended" ? addDays(today, -10) : "",
      budget_type: "daily" as const,
      budget,
      status,
      media_buyer: buyers[ci === 2 ? 1 : 0],
      external_campaign_id: `2385${1000000 + k}`,
    })),
    ACTOR,
  );
  console.log(`  + Campaigns: ${campaigns.length} rows`);

  const adsets = await bulkInsert(
    "AdSets",
    campaigns.flatMap((c) => [
      { campaign_id: c.id, company_id: c.company_id, name: "اهتمامات - 25-45", audience: "الرياض، 25-45، اهتمامات ذات صلة", placements: "Advantage+", budget: Math.round(c.budget * 0.6), status: "active" as const },
      { campaign_id: c.id, company_id: c.company_id, name: "إعادة استهداف", audience: "زوار الموقع آخر 30 يومًا", placements: "Feeds, Stories", budget: Math.round(c.budget * 0.4), status: "active" as const },
    ]),
    ACTOR,
  );
  console.log(`  + AdSets: ${adsets.length} rows`);
}

/* ---------- 60 days of daily results (ad level) ---------- */
async function seedResults() {
  if ((await getAll("DailyResults", { includeDeleted: true })).length) {
    console.log("  = DailyResults: already has rows, skipped");
    return;
  }
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const [campaigns, adsets, platforms] = await Promise.all([getAll("Campaigns"), getAll("AdSets"), getAll("Platforms")]);
  const pname = new Map(platforms.map((p) => [p.id, p.name]));
  const today = todayISO();
  const rows: Record<string, unknown>[] = [];
  for (const c of campaigns) {
    const platform = pname.get(c.platform_id) ?? "Meta";
    const sets = adsets.filter((a) => a.campaign_id === c.id);
    // Quality differs per campaign so rankings and alerts have something to show.
    const quality = 0.6 + rnd() * 0.9;
    for (let back = 60; back >= 1; back--) {
      const date = addDays(today, -back);
      if (date < c.start_date) continue;
      if (c.end_date && date > c.end_date) continue;
      if (c.status === "paused" && back <= 12) continue;
      const weekend = [4, 5].includes(new Date(date + "T00:00:00Z").getUTCDay()); // Thu/Fri
      sets.forEach((a, k) => {
        const ad_name = `${c.name} | ${k === 0 ? "فيديو 9:16" : "صورة 1:1"}`;
        const spend = Math.round(c.budget * (k === 0 ? 0.6 : 0.4) * (0.7 + rnd() * 0.5) * (weekend ? 1.15 : 1) * 100) / 100;
        const cpm = (platform === "Google Ads" ? 45 : platform === "Snapchat" ? 12 : platform === "TikTok" ? 14 : 24) * (0.8 + rnd() * 0.4);
        const impressions = Math.round((spend / cpm) * 1000);
        // Ad fatigue on the first Meta campaign: frequency climbs and CTR falls in the last days.
        const fatigue = c.name.startsWith("مشروع الياسمين") && k === 0 && back <= 6 ? 1 + (7 - back) * 0.35 : 1;
        const reach = Math.round(impressions / ((1.25 + rnd() * 0.6) * fatigue));
        const ctr = (platform === "Google Ads" ? 0.035 : 0.009) * quality * (0.8 + rnd() * 0.4) / fatigue;
        const link_clicks = Math.round(impressions * ctr);
        const clicks = Math.round(link_clicks * 1.5);
        const conv = Math.round(link_clicks * (0.06 + rnd() * 0.06) * quality);
        const isVideo = k === 0 || platform === "TikTok";
        const v3 = isVideo ? Math.round(impressions * (0.22 + rnd() * 0.12)) : 0;
        const thruplay = isVideo ? Math.round(v3 * (0.18 + rnd() * 0.1)) : 0;
        const leads = c.objective === "Leads" ? conv : 0;
        const messages = c.objective === "Messages" ? conv : 0;
        const purchases = c.objective === "Sales" ? conv : 0;
        const purchase_value = purchases * Math.round(60 + rnd() * 50);
        const results = c.objective === "Awareness" ? reach : c.objective === "Traffic" ? link_clicks : conv;
        const result_type = { Leads: "leads", Messages: "messages", Sales: "purchases", Awareness: "reach", Traffic: "link_clicks", Engagement: "engagement" }[c.objective];
        rows.push({
          row_key: rowKey({ date, company_id: c.company_id, platform_id: c.platform_id, campaign_id: c.id, adset_id: a.id, ad_name }),
          date, company_id: c.company_id, platform_id: c.platform_id, campaign_id: c.id, adset_id: a.id, ad_name, creative_id: "",
          spend, impressions, reach, frequency: reach ? impressions / reach : 0, clicks, link_clicks,
          ctr: impressions ? link_clicks / impressions : 0, cpc: link_clicks ? spend / link_clicks : 0, cpm: impressions ? (spend / impressions) * 1000 : 0,
          results, result_type, cost_per_result: results ? spend / results : 0, leads, messages, purchases, purchase_value,
          roas: spend ? purchase_value / spend : 0, video_views: Math.round(v3 * 1.4), video_3s_views: v3, thruplay,
          engagement: Math.round(clicks * 1.8), import_batch_id: "", source: "import",
        });
      });
    }
  }
  const res = await upsertMany("DailyResults", "row_key", rows, ACTOR);
  console.log(`  + DailyResults: ${res.inserted.length} rows (60 days)`);
}

main().catch((e) => {
  console.error("seed failed:", e?.message ?? e);
  process.exit(1);
});
