import { platformStyle } from "@/lib/platforms";
import { cn } from "@/lib/utils";

export function PlatformDot({ name, className }: { name: string; className?: string }) {
  return <span className={cn("inline-block size-2.5 shrink-0 rounded-full", className)} style={{ backgroundColor: platformStyle(name).color }} />;
}

export function PlatformBadge({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 text-xs font-medium num", className)}>
      <PlatformDot name={name} />
      {name}
    </span>
  );
}
