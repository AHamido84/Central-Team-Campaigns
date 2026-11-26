import type { Permission } from "@/lib/auth/permissions";

export type NavKey = "dashboard" | "companies" | "campaigns" | "import" | "creatives" | "schedule" | "budgets" | "reports" | "settings";

export interface NavItem {
  key: NavKey;
  href: string;
  permission: Permission;
  group: "groupWork" | "groupInsights" | "groupAdmin";
  phase: number;
}

export const NAV: NavItem[] = [
  { key: "dashboard", href: "/", permission: "dashboard:view", group: "groupWork", phase: 4 },
  { key: "companies", href: "/companies", permission: "company:view", group: "groupWork", phase: 2 },
  { key: "campaigns", href: "/campaigns", permission: "campaign:view", group: "groupWork", phase: 2 },
  { key: "import", href: "/import", permission: "results:import", group: "groupWork", phase: 3 },
  { key: "creatives", href: "/creatives", permission: "creative:view", group: "groupWork", phase: 5 },
  { key: "schedule", href: "/schedule", permission: "schedule:view", group: "groupWork", phase: 6 },
  { key: "budgets", href: "/budgets", permission: "budget:view", group: "groupInsights", phase: 7 },
  { key: "reports", href: "/reports", permission: "report:view", group: "groupInsights", phase: 8 },
  { key: "settings", href: "/settings", permission: "settings:manage", group: "groupAdmin", phase: 9 },
];
