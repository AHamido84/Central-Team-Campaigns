"use client";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const t = useTranslations("common");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("theme")}>
          <Sun className="dark:hidden" />
          <Moon className="hidden dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[9rem]">
        <DropdownMenuItem onClick={() => setTheme("light")}><Sun />{t("light")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}><Moon />{t("dark")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}><Monitor />{t("system")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
