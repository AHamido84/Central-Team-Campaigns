import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { setBackend } from "@/lib/sheets/client";
import { MemorySheetBackend } from "@/lib/sheets/memory-backend";
import { invalidate } from "@/lib/sheets/cache";
import { initSheets } from "@/lib/sheets/init";
import * as repo from "@/lib/sheets/repository";
import { withBackoff } from "@/lib/sheets/retry";

let backend: MemorySheetBackend;

beforeEach(async () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ads-hub-")), "db.json");
  backend = new MemorySheetBackend(file);
  setBackend(backend);
  invalidate();
  await initSheets(() => {});
});

describe("sheets repository", () => {
  it("creates every tab with system columns", async () => {
    const tabs = await backend.listTabs();
    expect(tabs).toContain("DailyResults");
    expect(tabs).toContain("ImportChanges");
    const { headers } = await backend.readTab("Companies");
    expect(headers[0]).toBe("id");
    expect(headers).toEqual(expect.arrayContaining(["created_at", "updated_at", "created_by", "is_deleted"]));
  });

  it("init is idempotent and adds new columns without touching data", async () => {
    await repo.insert("Companies", { name_ar: "أ", name_en: "A" }, "t@x.com");
    await repo.flushWrites();
    await initSheets(() => {});
    const all = await repo.getAll("Companies");
    expect(all).toHaveLength(1);
  });

  it("insert, getById, update, softDelete", async () => {
    const c = await repo.insert("Companies", { name_ar: "شركة", name_en: "Co", monthly_budget: 5000, currency: "SAR" }, "a@x.com");
    expect(c.id).toMatch(/[0-9a-f-]{36}/);
    expect((await repo.getById("Companies", c.id))?.monthly_budget).toBe(5000);

    const u = await repo.update("Companies", c.id, { monthly_budget: 7000 }, "a@x.com");
    expect(u?.monthly_budget).toBe(7000);
    expect(u?.created_by).toBe("a@x.com");

    await repo.softDelete("Companies", c.id, "a@x.com");
    expect(await repo.getById("Companies", c.id)).toBeNull();
    expect(await repo.getAll("Companies")).toHaveLength(0);
    expect(await repo.getAll("Companies", { includeDeleted: true })).toHaveLength(1);
  });

  it("batches concurrent writes into one append", async () => {
    let appends = 0;
    const orig = backend.appendRows.bind(backend);
    backend.appendRows = async (tab, rows) => {
      appends++;
      return orig(tab, rows);
    };
    await repo.bulkInsert("Platforms", [{ name: "Meta" }, { name: "TikTok" }, { name: "Snapchat" }], "a@x.com");
    expect(appends).toBe(1);
    expect(await repo.getAll("Platforms")).toHaveLength(3);
  });

  it("upsertMany never creates duplicates", async () => {
    const rows = [
      { row_key: "k1", date: "2026-11-01", spend: 100 },
      { row_key: "k2", date: "2026-11-02", spend: 200 },
    ];
    const first = await repo.upsertMany("DailyResults", "row_key", rows, "a@x.com");
    expect(first.inserted).toHaveLength(2);
    const second = await repo.upsertMany("DailyResults", "row_key", [...rows, { row_key: "k2", date: "2026-11-02", spend: 250 }], "a@x.com");
    expect(second.inserted).toHaveLength(0);
    expect(second.updated).toHaveLength(2);
    const all = await repo.getAll("DailyResults");
    expect(all).toHaveLength(2);
    expect(all.find((r) => r.row_key === "k2")?.spend).toBe(250);
    expect(second.updated.find((u) => u.row.row_key === "k2")?.previous.spend).toBe(200);
  });

  it("restoreRows puts previous values back", async () => {
    await repo.upsertMany("DailyResults", "row_key", [{ row_key: "k1", spend: 100 }], "a");
    const res = await repo.upsertMany("DailyResults", "row_key", [{ row_key: "k1", spend: 999 }], "a");
    await repo.restoreRows("DailyResults", res.updated.map((u) => u.previous));
    expect((await repo.getAll("DailyResults"))[0].spend).toBe(100);
  });
});

describe("withBackoff", () => {
  it("retries 429 then succeeds", async () => {
    let n = 0;
    const out = await withBackoff(
      async () => {
        if (n++ < 2) throw Object.assign(new Error("rate"), { code: 429 });
        return "ok";
      },
      { sleep: async () => {} },
    );
    expect(out).toBe("ok");
    expect(n).toBe(3);
  });

  it("does not retry 400", async () => {
    let n = 0;
    await expect(
      withBackoff(
        async () => {
          n++;
          throw Object.assign(new Error("bad"), { code: 400 });
        },
        { sleep: async () => {} },
      ),
    ).rejects.toThrow("bad");
    expect(n).toBe(1);
  });
});
