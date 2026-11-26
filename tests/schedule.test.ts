import { describe, expect, it } from "vitest";
import { addMonths, monthGrid, weekStart } from "@/lib/dates";
import { effectiveStatus } from "@/lib/data/schedule";
import { ScheduleInput } from "@/types/forms";

describe("schedule", () => {
  it("a scheduled post whose day passed is late", () => {
    expect(effectiveStatus({ status: "scheduled", scheduled_date: "2026-11-24" }, "2026-11-26")).toBe("late");
    expect(effectiveStatus({ status: "scheduled", scheduled_date: "2026-11-26" }, "2026-11-26")).toBe("scheduled");
    expect(effectiveStatus({ status: "published", scheduled_date: "2026-11-01" }, "2026-11-26")).toBe("published");
  });
  it("weeks start on Sunday and the month grid has 42 days", () => {
    expect(weekStart("2026-11-26")).toBe("2026-11-22"); // Thursday -> Sunday
    const g = monthGrid("2026-11-15");
    expect(g).toHaveLength(42);
    expect(g[0]).toBe("2026-11-01"); // Nov 1st 2026 is a Sunday
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-01");
  });
  it("validates time as HH:MM", () => {
    const base = { creative_id: "c", platform_id: "p", scheduled_date: "2026-11-26" };
    expect(ScheduleInput.safeParse({ ...base, scheduled_time: "18:30" }).success).toBe(true);
    expect(ScheduleInput.safeParse({ ...base, scheduled_time: "25:00" }).success).toBe(false);
  });
});
