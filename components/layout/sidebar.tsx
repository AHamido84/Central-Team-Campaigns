import type { NavItem } from "@/lib/nav";
import { BrandBlock } from "./brand-block";
import { NavLinks } from "./nav-links";

export function Sidebar({ items }: { items: NavItem[] }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto bg-sidebar text-sidebar-foreground lg:flex">
      <BrandBlock />
      <NavLinks items={items} />
      <div className="mt-auto px-6 py-5 text-[11px] text-sidebar-muted">© Qaswarah Holding</div>
    </aside>
  );
}
