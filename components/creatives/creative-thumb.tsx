import { Clapperboard, GalleryHorizontal, Image as ImageIcon, PlaySquare, Smartphone, UserRound } from "lucide-react";
import { thumbnailFor } from "@/lib/drive";
import { cn } from "@/lib/utils";
import type { Creative } from "@/types/entities";

const ICONS = { image: ImageIcon, video: PlaySquare, carousel: GalleryHorizontal, story: Smartphone, reel: Clapperboard, UGC: UserRound } as const;
const RATIO: Record<string, string> = { "1:1": "1 / 1", "9:16": "9 / 16", "4:5": "4 / 5", "16:9": "16 / 9" };

/** Thumbnail in a fixed frame; falls back to a branded placeholder with the type icon. */
export function CreativeThumb({ c, className, fit = "frame" }: { c: Pick<Creative, "thumbnail_url" | "file_url" | "type" | "aspect_ratio" | "title">; className?: string; fit?: "frame" | "native" }) {
  const src = thumbnailFor(c);
  const Icon = ICONS[c.type] ?? ImageIcon;
  return (
    <div className={cn("relative overflow-hidden bg-gradient-to-br from-brand-primary to-brand-secondary", className)} style={fit === "native" ? { aspectRatio: RATIO[c.aspect_ratio] ?? "1 / 1" } : undefined}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={c.title} loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center justify-center rounded-md border border-white/25 bg-white/5 text-white/80" style={{ aspectRatio: RATIO[c.aspect_ratio] ?? "1 / 1", height: "62%" }}>
            <Icon className="size-7" aria-hidden />
          </div>
        </div>
      )}
      <span className="num absolute bottom-2 start-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">{c.aspect_ratio}</span>
    </div>
  );
}
