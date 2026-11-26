/** Fields a file column can be mapped to (DailyResults + identifying names). */
export const TARGET_FIELDS = [
  "date",
  "date_end",
  "campaign_name",
  "campaign_external_id",
  "adset_name",
  "adset_external_id",
  "ad_name",
  "ad_external_id",
  "spend",
  "impressions",
  "reach",
  "frequency",
  "clicks",
  "link_clicks",
  "ctr",
  "cpc",
  "cpm",
  "results",
  "result_type",
  "cost_per_result",
  "leads",
  "messages",
  "purchases",
  "purchase_value",
  "roas",
  "video_views",
  "video_3s_views",
  "thruplay",
  "engagement",
] as const;
export type TargetField = (typeof TARGET_FIELDS)[number];

export const REQUIRED_FIELDS: TargetField[] = ["date", "campaign_name", "spend"];

export const TEXT_FIELDS = new Set<TargetField>([
  "campaign_name",
  "campaign_external_id",
  "adset_name",
  "adset_external_id",
  "ad_name",
  "ad_external_id",
  "result_type",
]);
export const DATE_FIELDS = new Set<TargetField>(["date", "date_end"]);
export const isNumberField = (f: TargetField) => !TEXT_FIELDS.has(f) && !DATE_FIELDS.has(f);

/** Column name -> target field ("" = ignored). */
export type ColumnMapping = Record<string, TargetField | "">;
