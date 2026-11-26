import { createHash } from "node:crypto";
import { normalizeName } from "./normalize";

/**
 * Unique key of a DailyResults row: date + company + platform + campaign +
 * ad set + ad. Uploading the same data again maps to the same key, so it
 * updates the existing row instead of adding a duplicate.
 */
export function rowKey(p: { date: string; company_id: string; platform_id: string; campaign_id: string; adset_id: string; ad_name: string }): string {
  const raw = [p.date, p.company_id, p.platform_id, p.campaign_id, p.adset_id || "-", normalizeName(p.ad_name || "-")].join("|");
  return createHash("sha1").update(raw).digest("hex").slice(0, 24);
}
