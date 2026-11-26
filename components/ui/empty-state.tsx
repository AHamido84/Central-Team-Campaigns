import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/60 px-6 py-16 text-center", className)}>
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-brand-accent/15 text-brand-primary dark:text-brand-accent">
        <Icon className="size-7" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {body && <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
