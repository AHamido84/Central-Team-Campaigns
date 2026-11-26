import { META_COLUMNS } from "../meta-columns";
import type { PlatformAdapter } from "./types";

export const metaAdapter: PlatformAdapter = {
  key: "meta",
  platforms: ["meta", "facebook", "instagram"],
  columns: META_COLUMNS,
  postProcess(row) {
    // Meta often exports Purchase ROAS without the conversion value. We need the
    // value itself so ROAS can be recomputed correctly over any period.
    if (!row.purchase_value && row.roas && row.spend) row.purchase_value = Math.round(row.roas * row.spend * 100) / 100;
    // Lead campaigns: Results are leads when the Leads column is missing.
    if (!row.leads && row.results && /lead/i.test(row.result_type)) row.leads = row.results;
    if (!row.messages && row.results && /messag|conversation/i.test(row.result_type)) row.messages = row.results;
    return row;
  },
};
