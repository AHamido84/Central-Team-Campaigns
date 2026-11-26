import { describe, expect, it } from "vitest";
import { metricsOf, groupMetrics, pctChange } from "@/lib/metrics";

describe("metrics", () => {
  it("computes CPL from totals, not the average of daily CPLs", () => {
    const rows = [
      { spend: 100, leads: 1 }, // CPL 100
      { spend: 100, leads: 9 }, // CPL 11.1
    ];
    const m = metricsOf(rows);
    expect(m.cpl).toBe(20); // 200 / 10, NOT (100 + 11.1) / 2 = 55.6
  });
  it("CTR, CPM, ROAS and video rates", () => {
    const m = metricsOf([
      { spend: 50, impressions: 10000, clicks: 100, purchase_value: 200, video_3s_views: 3000, thruplay: 600 },
      { spend: 50, impressions: 10000, clicks: 60, purchase_value: 100, video_3s_views: 1000, thruplay: 200 },
    ]);
    expect(m.ctr).toBeCloseTo(0.008);
    expect(m.cpm).toBeCloseTo(5);
    expect(m.roas).toBeCloseTo(3);
    expect(m.hook_rate).toBeCloseTo(0.2);
    expect(m.hold_rate).toBeCloseTo(0.2);
  });
  it("returns null instead of Infinity", () => {
    expect(metricsOf([{ spend: 10 }]).cpl).toBeNull();
  });
  it("groups", () => {
    const g = groupMetrics([{ c: "a", spend: 1, leads: 1 }, { c: "a", spend: 3, leads: 1 }, { c: "b", spend: 5, leads: 0 }] as never[], (r: { c: string }) => r.c);
    expect(g.get("a")?.cpl).toBe(2);
    expect(g.get("b")?.cpl).toBeNull();
  });
  it("pctChange", () => {
    expect(pctChange(120, 100)).toBeCloseTo(0.2);
    expect(pctChange(1, 0)).toBeNull();
  });
});
