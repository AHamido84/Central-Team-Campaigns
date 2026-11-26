import { describe, expect, it } from "vitest";
import { cleanNumber, normalizeHeader, parseDate } from "@/lib/import/normalize";
import { detectMapping, detectLevel, transformRows } from "@/lib/import/transform";
import { metaAdapter } from "@/lib/import/adapters/meta";

describe("cleanNumber", () => {
  it.each([
    ["1,234.50", 1234.5],
    ["SAR 1,234", 1234],
    ["1.234,5", 1234.5],
    ["١٬٢٣٤٫٥", 1234.5],
    ["12.5%", 12.5],
    ["ر.س 99", 99],
    ["3,5", 3.5],
    [" 42 ", 42],
    [7, 7],
  ])("%s -> %s", (input, out) => expect(cleanNumber(input)).toBe(out));
  it("empty is null, text is NaN", () => {
    expect(cleanNumber("")).toBeNull();
    expect(cleanNumber("—")).toBeNull();
    expect(cleanNumber("abc")).toBeNaN();
  });
});

describe("parseDate", () => {
  it.each([
    ["2026-11-05", "2026-11-05"],
    ["2026/11/5", "2026-11-05"],
    ["05/11/2026", "2026-11-05"],
    ["11/25/2026", "2026-11-25"],
    ["٢٠٢٦-١١-٠٥", "2026-11-05"],
    [46331, "2026-11-05"],
  ])("%s -> %s", (input, out) => expect(parseDate(input)).toBe(out));
  it("rejects invalid", () => {
    expect(parseDate("2026-02-30")).toBeNull();
    expect(parseDate("yesterday")).toBeNull();
  });
});

describe("column detection", () => {
  it("detects English Meta columns", () => {
    const m = detectMapping(["Campaign name", "Ad set name", "Ad name", "Reporting starts", "Reporting ends", "Amount spent (SAR)", "Impressions", "Reach", "Results", "Cost per result", "Link clicks", "CTR (link click-through rate)", "CPM (cost per 1,000 impressions)", "Frequency", "Leads", "Purchases", "Purchase ROAS (return on ad spend)"], metaAdapter);
    expect(m["Campaign name"]).toBe("campaign_name");
    expect(m["Amount spent (SAR)"]).toBe("spend");
    expect(m["Reporting starts"]).toBe("date");
    expect(m["Purchase ROAS (return on ad spend)"]).toBe("roas");
    expect(m["CTR (link click-through rate)"]).toBe("ctr");
    expect(detectLevel(m)).toBe("ad");
  });
  it("detects Arabic Meta columns with letter variants", () => {
    const m = detectMapping(["اسم الحملة", "بدء إعداد التقارير", "المبلغ الذي تم إنفاقه (SAR)", "مرات الظهور", "الوصول", "النتائج", "العملاء المحتملون", "النقرات على الرابط"], metaAdapter);
    expect(m["اسم الحملة"]).toBe("campaign_name");
    expect(m["بدء إعداد التقارير"]).toBe("date");
    expect(m["المبلغ الذي تم إنفاقه (SAR)"]).toBe("spend");
    expect(m["العملاء المحتملون"]).toBe("leads");
    expect(normalizeHeader("بدء اعداد التقارير")).toBe(normalizeHeader("بدء إعداد التقارير"));
  });
  it("saved mapping wins", () => {
    const m = detectMapping(["Spend custom"], metaAdapter, [{ source_column: "Spend custom", target_field: "spend" }]);
    expect(m["Spend custom"]).toBe("spend");
  });
});

describe("transformRows", () => {
  const headers = ["Campaign name", "Reporting starts", "Amount spent (SAR)", "Impressions", "Purchase ROAS (return on ad spend)"];
  const mapping = detectMapping(headers, metaAdapter);
  it("cleans, derives purchase value, drops total row, flags issues", () => {
    const { rows, ignored } = transformRows(
      headers,
      [
        ["C1", "2026-11-01", "1,000.00", "50,000", "2.5"],
        ["C1", "not a date", "10", "1", ""],
        ["", "2026-11-02", "5", "1", ""],
        ["", "", "1,015", "50,002", ""], // Meta total row
        ["", "", "", "", ""],
      ],
      mapping,
      metaAdapter,
    );
    expect(ignored).toBe(2);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ spend: 1000, impressions: 50000, purchase_value: 2500, issues: [] });
    expect(rows[1].issues).toContain("invalidDate");
    expect(rows[2].issues).toContain("missingCampaign");
  });
});
