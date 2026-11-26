"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarDays, FileBarChart, Building2, LayoutDashboard, Megaphone, Palette, Settings, Upload, Wallet, type LucideIcon } from "lucide-react";
import type { NavItem, NavKey } from "@/lib/nav";
import { cn } from "@/lib/utils";

const ICONS: Record<NavKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  companies: Building2,
  campaigns: Megaphone,
  import: Upload,
  creatives: Palette,
  schedule: CalendarDays,
  budgets: Wallet,
  reports: FileBarChart,
  settings: Settings,
};

export function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const groups = ["groupWork", "groupInsights", "groupAdmin"] as const;

  return (
    <nav className="flex flex-col gap-6 px-3">
      {groups.map((g) => {
        const list = items.filter((i) => i.group === g);
        if (!list.length) return null;
        return (
          <div key={g} className="flex flex-col gap-1">
            <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-sidebar-muted">{t(g)}</p>
            {list.map((item) => {
              const Icon = ICONS[item.key];
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    active ? "bg-white/10 font-medium text-white" : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-white",
                  )}
                >
                  {active && <span className="absolute inset-y-2 start-0 w-1 rounded-full bg-brand-accent" />}
                  <Icon className={cn("size-[18px]", active ? "text-brand-accent" : "text-sidebar-muted group-hover:text-sidebar-foreground")} />
                  {t(item.key)}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
