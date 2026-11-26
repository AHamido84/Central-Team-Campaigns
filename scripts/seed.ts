import "./env";
import { getAll, bulkInsert, flushWrites } from "../lib/sheets/repository";
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

  console.log("Done.");
}

main().catch((e) => {
  console.error("seed failed:", e?.message ?? e);
  process.exit(1);
});
