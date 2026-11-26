import type { AuthUser } from "@/lib/auth/permissions";
import type { NavItem } from "@/lib/nav";
import { signOut } from "@/auth";
import { LocaleToggle } from "./locale-toggle";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { Logo } from "./logo";

export function Topbar({ user, items }: { user: AuthUser; items: NavItem[] }) {
  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6">
      <MobileNav items={items} />
      <Logo size={30} className="lg:hidden" />
      <div className="flex-1" />
      <LocaleToggle />
      <ThemeToggle />
      <UserMenu user={user} signOutAction={signOutAction} />
    </header>
  );
}
