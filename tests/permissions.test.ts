import { describe, expect, it } from "vitest";
import { can, canAccessCompany, hasPermission, scopeToUser, type AuthUser } from "@/lib/auth/permissions";

const u = (role: AuthUser["role"], company_ids: string[] = []): AuthUser => ({ id: "1", email: "x@y", name: "x", role, company_ids });

describe("permissions", () => {
  it("admin can do everything", () => {
    expect(hasPermission(u("Admin"), "settings:manage")).toBe(true);
    expect(can(u("Admin"), "campaign:manage", "c1")).toBe(true);
  });
  it("media buyer is limited to assigned companies", () => {
    const b = u("MediaBuyer", ["c1"]);
    expect(can(b, "results:import", "c1")).toBe(true);
    expect(can(b, "results:import", "c2")).toBe(false);
    expect(can(b, "creative:approve")).toBe(false);
  });
  it("designer only creatives and schedule", () => {
    const d = u("Designer", ["*"]);
    expect(hasPermission(d, "creative:manage")).toBe(true);
    expect(hasPermission(d, "schedule:manage")).toBe(true);
    expect(hasPermission(d, "campaign:view")).toBe(false);
    expect(hasPermission(d, "dashboard:view")).toBe(false);
  });
  it("viewer is read only and can be limited to one company", () => {
    const v = u("Viewer", ["c1"]);
    expect(hasPermission(v, "report:view")).toBe(true);
    expect(hasPermission(v, "campaign:manage")).toBe(false);
    expect(canAccessCompany(v, "c2")).toBe(false);
    expect(scopeToUser(v, [{ company_id: "c1" }, { company_id: "c2" }])).toHaveLength(1);
  });
});
