import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/lib/auth/permissions";
import { assertCanRunReport } from "@/lib/data/reports";
import { parseReportParams, reportQuery } from "@/lib/reports/params";

const u = (role: AuthUser["role"], company_ids = ["*"]): AuthUser => ({ id: "u", email: `${role}@x.test`, name: role, role, company_ids });

describe("report params", () => {
  it("defaults to a consolidated report for last month with every section", () => {
    const p = parseReportParams({});
    expect(p.type).toBe("consolidated");
    expect(p.preset).toBe("last_month");
    expect(p.sections.length).toBe(7);
  });
  it("round-trips through the query string", () => {
    const p = parseReportParams({ type: "company", company: "c1", sections: "kpis,campaigns", range: "custom", from: "2026-10-01", to: "2026-10-15" });
    const back = parseReportParams(Object.fromEntries(new URLSearchParams(reportQuery(p))));
    expect(back).toMatchObject({ type: "company", company: "c1", sections: ["kpis", "campaigns"], from: "2026-10-01", to: "2026-10-15" });
  });
});

describe("who may run which report", () => {
  const p = (x: Record<string, string>) => parseReportParams(x);
  it("lets managers run any report", () => {
    expect(() => assertCanRunReport(u("Manager"), p({ type: "consolidated" }))).not.toThrow();
    expect(() => assertCanRunReport(u("Manager"), p({ type: "buyer", buyer: "someone@x.test" }))).not.toThrow();
  });
  it("limits media buyers to their own buyer report", () => {
    const b = u("MediaBuyer");
    expect(() => assertCanRunReport(b, p({ type: "buyer", buyer: b.email }))).not.toThrow();
    expect(() => assertCanRunReport(b, p({ type: "buyer", buyer: "other@x.test" }))).toThrow();
    expect(() => assertCanRunReport(b, p({ type: "consolidated" }))).toThrow();
    expect(() => assertCanRunReport(b, p({ type: "company", company: "c1" }))).toThrow();
  });
  it("blocks company reports outside the user's companies, and designers entirely", () => {
    expect(() => assertCanRunReport(u("Viewer", ["c2"]), p({ type: "company", company: "c1" }))).toThrow();
    expect(() => assertCanRunReport(u("Viewer", ["c1"]), p({ type: "company", company: "c1" }))).not.toThrow();
    expect(() => assertCanRunReport(u("Designer"), p({ type: "consolidated" }))).toThrow();
  });
});
