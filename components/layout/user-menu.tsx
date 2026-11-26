"use client";
import { useTransition } from "react";
import Link from "next/link";
import { KeyRound, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AuthUser } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function UserMenu({ user, signOutAction }: { user: AuthUser; signOutAction: () => Promise<void> }) {
  const t = useTranslations();
  const [, startTransition] = useTransition();
  const initials = (user.name || user.email).slice(0, 2).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full p-0.5 outline-none ring-ring focus-visible:ring-2">
        <span className="num grid size-9 place-items-center rounded-full bg-brand-primary text-xs font-semibold text-brand-accent dark:bg-brand-accent dark:text-brand-primary">
          {initials}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <p className="font-medium">{user.name}</p>
          <p className="num truncate text-xs text-muted-foreground">{user.email}</p>
          <Badge variant="accent" className="mt-2">{t(`roles.${user.role}`)}</Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account"><KeyRound />{t("account.title")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => startTransition(() => signOutAction())}>
          <LogOut />
          {t("common.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
