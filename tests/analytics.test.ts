import { describe, expect, it } from "vitest";
import { parseFilters, previousPeriod } from "@/lib/filters";
import { kpisOf, dailySeries } from "@/lib/data/analytics";
import { campaignPacing } from "@/lib/data/campaign-analytics";
import { metricsOf } from "@/lib/metrics";
import { fmtMetric } from "@/lib/metric-format";

const row = (date: string, spend: number, leads: number) => ({ date, spend, leads, results: leads, impressions: 1000, clicks: 10 }) as never;

describe("filters", () => {
  it("defaults to the last 30 full days with comparison", () => {
    const f = parseFilters({}, "2026-11-26");
    expect([f.from, f.to, f.compare]).toEqual(["2026-10-27", "2026-11-25", true]);
  });
  it("previous period has the same length and ends the day before", () => {
    expect(previousPeriod("2026-11-19", "2026-11-25")).toEqual({ from: "2026-11-12", to: "2026-11-18" });
  });
  it("swaps a reversed custom range and turns comparison off with compare=0", () => {
    const f = parseFilters({ range: "custom", from: "2026-11-10", to: "2026-11-01", compare: "0" }, "2026-11-26");
    expect([f.from, f.to, f.compare]).toEqual(["2026-11-01", "2026-11-10", false]);
  });
});

describe("kpis", () => {
  it("computes change from totals and marks direction quality", () => {
    const cur = metricsOf([row("2026-11-01", 100, 5), row("2026-11-02", 100, 5)]);
    const prev = metricsOf([row("2026-10-30", 100, 4), row("2026-10-31", 100, 6)]);
    const [spend, cpl] = kpisOf(cur, prev, ["spend", "cpl"]);
    expect(spend.change).toBe(0);
    expect(cpl.value).toBe(20);
    expect(cpl.higherIsBetter).toBe(false);
  });
  it("fills days with no data with zero", () => {
    const d = dailySeries([row("2026-11-02", 50, 1)], "2026-11-01", "2026-11-03");
    expect(d.map((x) => x.spend)).toEqual([0, 50, 0]);
  });
});

describe("campaign pacing", () => {
  it("daily budget: expected = daily budget x days run", () => {
    const p = campaignPacing({ budget: 100, budget_type: "daily", start_date: "2026-11-01", end_date: "" } as never, [row("2026-11-01", 90, 0), row("2026-11-10", 95, 0)], "2026-11-11");
    expect(p?.budget).toBe(1000);
    expect(p?.spent).toBe(185);
  });
  it("lifetime budget projects to the end date", () => {
    const p = campaignPacing({ budget: 3000, budget_type: "lifetime", start_date: "2026-11-01", end_date: "2026-11-30" } as never, [row("2026-11-05", 500, 0)], "2026-11-11");
    expect(p?.projected).toBe(1500);
  });
});

describe("metric format", () => {
  it("shows a dash for metrics that can't be computed", () => {
    expect(fmtMetric("cpl", null, "SAR", "en")).toBe("–");
    expect(fmtMetric("ctr", 0.0123, "SAR", "en")).toBe("1.23%");
  });
});
