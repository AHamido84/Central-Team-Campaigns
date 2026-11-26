import type { TargetField } from "../fields";
import type { ImportRow } from "../transform";

/**
 * One adapter per ad platform. To support TikTok / Snapchat / Google Ads
 * exports, add a file next to meta.ts with that platform's column names and
 * register it in adapters/index.ts.
 */
export interface PlatformAdapter {
  key: string;
  /** Platform names (Platforms tab) this adapter handles, lower case. */
  platforms: string[];
  columns: Record<TargetField, string[]>;
  /** Fix-ups after mapping, e.g. derive purchase value from ROAS. */
  postProcess?: (row: ImportRow) => ImportRow;
}
