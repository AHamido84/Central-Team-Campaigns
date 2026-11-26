import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePage } from "@/lib/auth/session";
import { NAV } from "@/lib/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePage();
  const items = NAV.filter((i) => hasPermission(user, i.permission));
  return (
    <div className="flex min-h-dvh">
      <Sidebar items={items} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} items={items} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
