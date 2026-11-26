import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { setBackend } from "@/lib/sheets/client";
import { invalidate } from "@/lib/sheets/cache";
import { initSheets } from "@/lib/sheets/init";
import { MemorySheetBackend } from "@/lib/sheets/memory-backend";
import * as repo from "@/lib/sheets/repository";
import { commitImport, previewImport, rollbackImport, type ImportPayload } from "@/lib/import/service";
import { detectMapping } from "@/lib/import/transform";
import { metaAdapter } from "@/lib/import/adapters/meta";
import type { AuthUser } from "@/lib/auth/permissions";

const admin: AuthUser = { id: "u", email: "admin@x.com", name: "A", role: "Admin", company_ids: ["*"] };
let companyId = "";
let platformId = "";
let existingCampaignId = "";

const headers = ["Campaign name", "Ad set name", "Ad name", "Reporting starts", "Reporting ends", "Amount spent (SAR)", "Impressions", "Reach", "Link clicks", "Results", "Result indicator", "Leads"];
const fileRows = [
  ["Existing campaign", "Set A", "Ad 1", "2026-11-01", "2026-11-01", "100", "10000", "8000", "120", "5", "actions:lead", "5"],
  ["Existing campaign", "Set A", "Ad 2", "2026-11-01", "2026-11-01", "50", "5000", "4000", "40", "1", "actions:lead", "1"],
  ["Brand new campaign", "Set B", "Ad 3", "2026-11-01", "2026-11-01", "1,200.50", "90,000", "70,000", "900", "30", "actions:lead", "30"],
  ["Brand new campaign", "Set B", "Ad 3", "2026-11-02", "2026-11-02", "80", "9000", "7000", "70", "2", "actions:lead", "2"],
  ["", "", "", "", "", "1430.5", "114000", "", "", "", "", ""], // Meta total row
  ["Broken", "x", "y", "31/02/2026", "", "1", "1", "1", "1", "", "", ""],
];

function payload(rows = fileRows): ImportPayload {
  return { companyId, platformId, fileName: "meta.csv", headers, rows, mapping: detectMapping(headers, metaAdapter) };
}

beforeEach(async () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ads-imp-")), "db.json");
  setBackend(new MemorySheetBackend(file));
  invalidate();
  await initSheets(() => {});
  const [p] = await repo.bulkInsert("Platforms", [{ name: "Meta", is_active: true }], "t");
  platformId = p.id;
  const c = await repo.insert("Companies", { name_ar: "ش", currency: "SAR" }, "t");
  companyId = c.id;
  const camp = await repo.insert("Campaigns", { company_id: companyId, platform_id: platformId, name: "Existing  Campaign", objective: "Leads", status: "active" }, "t");
  existingCampaignId = camp.id;
});

describe("Meta import", () => {
  it("preview summarizes, matches existing campaigns and flags bad rows", async () => {
    const pv = await previewImport(payload());
    expect(pv.validRows).toBe(4);
    expect(pv.skippedRows).toBe(2); // total row + invalid date
    expect(pv.dateFrom).toBe("2026-11-01");
    expect(pv.dateTo).toBe("2026-11-02");
    expect(pv.totalSpend).toBeCloseTo(1430.5);
    expect(pv.level).toBe("ad");
    const existing = pv.campaigns.find((c) => c.name === "Existing campaign");
    expect(existing?.match?.id).toBe(existingCampaignId);
    expect(pv.campaigns.find((c) => c.name === "Brand new campaign")?.match).toBeNull();
    expect(pv.issues.find((i) => i.issues.includes("invalidDate"))).toBeTruthy();
    expect(pv.toInsert).toBe(4);
  });

  it("uploading the same file twice creates zero duplicates", async () => {
    const first = await commitImport({ ...payload(), resolutions: {}, saveMapping: true }, admin);
    expect(first).toMatchObject({ inserted: 4, updated: 0, campaignsCreated: 1, adSetsCreated: 2 });
    const second = await commitImport({ ...payload(), resolutions: {}, saveMapping: true }, admin);
    expect(second).toMatchObject({ inserted: 0, updated: 4, campaignsCreated: 0, adSetsCreated: 0 });
    const results = await repo.getAll("DailyResults");
    expect(results).toHaveLength(4);
    expect(new Set(results.map((r) => r.row_key)).size).toBe(4);
    expect((await repo.getAll("Campaigns")).length).toBe(2);
    expect((await repo.getAll("ColumnMappings")).length).toBe(headers.length);
    const pv = await previewImport(payload());
    expect(pv.toUpdate).toBe(4);
    expect(pv.toInsert).toBe(0);
  });

  it("stores clean numbers and recomputed ratios", async () => {
    await commitImport({ ...payload(), resolutions: {}, saveMapping: false }, admin);
    const r = (await repo.getAll("DailyResults")).find((x) => x.ad_name === "Ad 3" && x.date === "2026-11-01")!;
    expect(r.spend).toBe(1200.5);
    expect(r.impressions).toBe(90000);
    expect(r.cpm).toBeCloseTo((1200.5 / 90000) * 1000);
    expect(r.leads).toBe(30);
    expect(r.source).toBe("import");
  });

  it("link to an existing campaign instead of creating", async () => {
    const res = await commitImport({ ...payload(), resolutions: { "name:brand new campaign": { mode: "link", campaignId: existingCampaignId } }, saveMapping: false }, admin);
    expect(res.campaignsCreated).toBe(0);
    const results = await repo.getAll("DailyResults");
    expect(results.every((r) => r.campaign_id === existingCampaignId)).toBe(true);
  });

  it("rollback removes inserted rows and restores updated rows", async () => {
    const first = await commitImport({ ...payload(), resolutions: {}, saveMapping: false }, admin);
    const changed = fileRows.map((r) => [...r]);
    changed[0][5] = "999"; // spend of Ad 1 changes
    changed.push(["Existing campaign", "Set A", "Ad 9", "2026-11-03", "", "10", "100", "90", "1", "0", "", "0"]);
    const second = await commitImport({ ...payload(changed), resolutions: {}, saveMapping: false }, admin);
    expect(second).toMatchObject({ inserted: 1, updated: 4 });

    // First batch can't be rolled back while the second one touched its rows.
    await expect(rollbackImport(first.batchId, admin.email)).rejects.toThrow(/rollbackBlocked/);

    const rb = await rollbackImport(second.batchId, admin.email);
    expect(rb).toEqual({ removed: 1, restored: 4 });
    let rows = await repo.getAll("DailyResults");
    expect(rows).toHaveLength(4);
    expect(rows.find((r) => r.ad_name === "Ad 1")?.spend).toBe(100);
    expect((await repo.getById("ImportBatches", second.batchId))?.status).toBe("rolled_back");

    await rollbackImport(first.batchId, admin.email);
    rows = await repo.getAll("DailyResults");
    expect(rows).toHaveLength(0);

    // Re-importing after rollback revives the rows without duplicates.
    const again = await commitImport({ ...payload(), resolutions: {}, saveMapping: false }, admin);
    expect(again.updated).toBe(4);
    expect(await repo.getAll("DailyResults")).toHaveLength(4);
    expect(await repo.getAll("DailyResults", { includeDeleted: true })).toHaveLength(5);
  });

  it("warns when mixing campaign-level and ad-level rows", async () => {
    await commitImport({ ...payload(), resolutions: {}, saveMapping: false }, admin);
    const h = ["Campaign name", "Day", "Amount spent (SAR)"];
    const pv = await previewImport({ companyId, platformId, fileName: "c.csv", headers: h, rows: [["Existing campaign", "2026-11-01", "150"]], mapping: detectMapping(h, metaAdapter) });
    expect(pv.level).toBe("campaign");
    expect(pv.warnings).toContain("levelMismatch");
  });

  it("refuses files without the required columns", async () => {
    const h = ["Campaign name", "Impressions"];
    await expect(previewImport({ companyId, platformId, fileName: "x.csv", headers: h, rows: [["a", "1"]], mapping: detectMapping(h, metaAdapter) })).rejects.toThrow(/missingFields:date,spend/);
  });
});
