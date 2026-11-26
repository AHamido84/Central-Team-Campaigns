"use client";
import { useState } from "react";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import type { NavItem } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NavLinks } from "./nav-links";
import { Logo } from "./logo";

export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("nav.openMenu")}>
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent aria-describedby={undefined}>
        <div className="flex items-center gap-3 px-6 py-6">
          <Logo size={34} />
          <SheetTitle className="text-[15px] font-semibold text-white">{t("app.org")}</SheetTitle>
        </div>
        <div className="overflow-y-auto pb-6">
          <NavLinks items={items} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
