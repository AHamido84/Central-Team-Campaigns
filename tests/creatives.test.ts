import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import { fatigueOf } from "@/lib/metrics/fatigue";
import { driveFileId, thumbnailFor } from "@/lib/drive";

const days = (end: string, n: number, f: (i: number) => { impressions: number; reach: number; link_clicks: number }) =>
  Array.from({ length: n }, (_, i) => ({ date: addDays(end, -i), spend: 100, clicks: 0, ...f(i) }));

describe("ad fatigue", () => {
  it("flags fatigue when CTR drops 25%+ and frequency is high", () => {
    // i < 7 is the last week: CTR 0.6% and frequency 3.3; the week before: CTR 1%, frequency 1.5
    const rows = days("2026-11-25", 14, (i) => (i < 7 ? { impressions: 1000, reach: 300, link_clicks: 6 } : { impressions: 1000, reach: 666, link_clicks: 10 }));
    const f = fatigueOf(rows, "2026-11-25");
    expect(f.level).toBe("fatigued");
    expect(f.ctrChange).toBeCloseTo(-0.4);
  });
  it("is healthy when CTR holds", () => {
    const rows = days("2026-11-25", 14, () => ({ impressions: 1000, reach: 700, link_clicks: 10 }));
    expect(fatigueOf(rows, "2026-11-25").level).toBe("healthy");
  });
  it("is unknown with too little data", () => {
    const rows = days("2026-11-25", 14, () => ({ impressions: 50, reach: 40, link_clicks: 1 }));
    expect(fatigueOf(rows, "2026-11-25").level).toBe("unknown");
  });
});

describe("drive links", () => {
  it("turns Drive share links into thumbnails", () => {
    const id = "1AbCdEfGhIjKlMnOpQrStUvWxYz012345";
    expect(driveFileId(`https://drive.google.com/file/d/${id}/view?usp=sharing`)).toBe(id);
    expect(thumbnailFor({ thumbnail_url: "", file_url: `https://drive.google.com/open?id=${id}` })).toContain(`thumbnail?id=${id}`);
    expect(thumbnailFor({ thumbnail_url: "", file_url: "https://example.com/video.mp4" })).toBeNull();
  });
});
