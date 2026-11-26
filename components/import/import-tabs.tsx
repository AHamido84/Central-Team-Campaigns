import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

const TABS = [
  ["upload", "/import"],
  ["manual", "/import/manual"],
  ["history", "/import/history"],
] as const;

export async function ImportTabs({ active }: { active: (typeof TABS)[number][0] }) {
  const t = await getTranslations("import.tabs");
  return (
    <nav className="mb-6 inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-muted p-1">
      {TABS.map(([k, href]) => (
        <Link key={k} href={href} className={cn("whitespace-nowrap rounded-lg px-3 py-1.5 text-sm", k === active ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          {t(k)}
        </Link>
      ))}
    </nav>
  );
}
