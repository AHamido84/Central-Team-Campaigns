/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

/** Company logo from logo_url, or initials on brand navy when there is none. */
export function CompanyLogo({ name, url, size = 48, className }: { name: string; url?: string; size?: number; className?: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("");
  return url ? (
    <img src={url} alt={name} width={size} height={size} className={cn("shrink-0 rounded-xl border bg-white object-contain p-1", className)} style={{ width: size, height: size }} />
  ) : (
    <span
      className={cn("grid shrink-0 place-items-center rounded-xl bg-brand-primary font-semibold text-brand-accent", className)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  );
}
