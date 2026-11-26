import { Flame, Eye, HeartPulse } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FatigueLevel } from "@/lib/metrics/fatigue";
import { cn } from "@/lib/utils";
import type { CreativeStatus } from "@/types/entities";

const STATUS_STYLE: Record<CreativeStatus, string> = {
  idea: "bg-muted text-muted-foreground",
  in_progress: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  review: "bg-warning/15 text-warning",
  revisions: "bg-destructive/10 text-destructive",
  approved: "bg-success/15 text-success",
  live: "bg-success text-white",
  paused: "bg-muted text-foreground",
  archived: "bg-muted text-muted-foreground line-through",
};

export function CreativeStatusBadge({ status, className }: { status: CreativeStatus; className?: string }) {
  const t = useTranslations("creatives.status");
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLE[status], className)}>{t(status)}</span>;
}

/** Icon + label, never color alone. Hidden when there is not enough data. */
export function FatigueBadge({ level, className }: { level: FatigueLevel; className?: string }) {
  const t = useTranslations("creatives.fatigue");
  if (level === "unknown") return null;
  const Icon = level === "fatigued" ? Flame : level === "watch" ? Eye : HeartPulse;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        level === "fatigued" ? "bg-destructive/10 text-destructive" : level === "watch" ? "bg-warning/15 text-warning" : "bg-success/10 text-success",
        className,
      )}
      title={t(`${level}Hint`)}
    >
      <Icon className="size-3" aria-hidden />
      {t(level)}
    </span>
  );
}
