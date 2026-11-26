import Image from "next/image";
import { cn } from "@/lib/utils";

/** Uses public/brand/qaswarah-logo.svg. Replace that file with the real logo. */
export function Logo({ className, size = 36 }: { className?: string; size?: number }) {
  return <Image src="/brand/qaswarah-logo.svg" alt="Qaswarah" width={size} height={size} className={cn("shrink-0 rounded-lg", className)} priority />;
}
