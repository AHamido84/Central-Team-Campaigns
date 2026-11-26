import { describe, expect, it } from "vitest";
import { monthInfo, project } from "@/lib/data/budgets";
import { MonthPlanInput } from "@/types/forms";

describe("budgets", () => {
  it("knows the month phase", () => {
    expect(monthInfo("2026-11", "2026-11-26")).toMatchObject({ from: "2026-11-01", to: "2026-11-30", days: 30, phase: "current" });
    expect(monthInfo("2026-10", "2026-11-26").phase).toBe("past");
    expect(monthInfo("2026-12", "2026-11-26").phase).toBe("future");
  });
  it("projects month-end spend from the last day with data", () => {
    // 25 days of data, 25,000 spent -> 1,000 a day x 30 days
    expect(project(25000, "2026-11-25", "2026-11", "2026-11-26")).toBe(30000);
    expect(project(40000, "2026-10-31", "2026-10", "2026-11-26")).toBe(40000);
  });
  it("validates the plan form", () => {
    const ok = MonthPlanInput.safeParse({ month: "2026-12", budgets: { p1: "5000" }, target_cpl: "40" });
    expect(ok.success && ok.data.budgets.p1).toBe(5000);
    expect(MonthPlanInput.safeParse({ month: "2026-13" }).success).toBe(false);
  });
});
