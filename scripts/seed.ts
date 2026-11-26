import "./env";
import { getAll, bulkInsert, flushWrites, update } from "../lib/sheets/repository";
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

main().catch((e) => {
  console.error("seed failed:", e?.message ?? e);
  process.exit(1);
});
