import type { Permission } from "@/lib/auth/permissions";

export type NavKey = "dashboard" | "companies" | "campaigns" | "import" | "creatives" | "schedule" | "budgets" | "reports" | "settings";

export interface NavItem {
  key: NavKey;
  href: string;
  permission: Permission;
  group: "groupWork" | "groupInsights" | "groupAdmin";
}

export const NAV: NavItem[] = [
  { key: "dashboard", href: "/", permission: "dashboard:view", group: "groupWork" },
  { key: "companies", href: "/companies", permission: "company:view", group: "groupWork" },
  { key: "campaigns", href: "/campaigns", permission: "campaign:view", group: "groupWork" },
  { key: "import", href: "/import", permission: "results:import", group: "groupWork" },
  { key: "creatives", href: "/creatives", permission: "creative:view", group: "groupWork" },
  { key: "schedule", href: "/schedule", permission: "schedule:view", group: "groupWork" },
  { key: "budgets", href: "/budgets", permission: "budget:view", group: "groupInsights" },
  { key: "reports", href: "/reports", permission: "report:view", group: "groupInsights" },
  { key: "settings", href: "/settings", permission: "settings:manage", group: "groupAdmin" },
];
