import { z } from "zod";
import { zBool, zDate, zEnum, zList, zNum, zStr } from "./coerce";

/* ---------- Enums ---------- */
export const ROLES = ["Admin", "Manager", "MediaBuyer", "Designer", "Viewer"] as const;
export type Role = (typeof ROLES)[number];

export const COMPANY_STATUS = ["active", "paused", "archived"] as const;
export const CAMPAIGN_OBJECTIVES = ["Leads", "Sales", "Awareness", "Traffic", "Messages", "Engagement"] as const;
export const BUDGET_TYPES = ["daily", "lifetime"] as const;
export const CAMPAIGN_STATUS = ["planned", "active", "paused", "ended"] as const;
export const CREATIVE_TYPES = ["image", "video", "carousel", "story", "reel", "UGC"] as const;
export const ASPECT_RATIOS = ["1:1", "9:16", "4:5", "16:9"] as const;
export const CREATIVE_STATUS = ["idea", "in_progress", "review", "revisions", "approved", "live", "paused", "archived"] as const;
export const SCHEDULE_STATUS = ["scheduled", "published", "late", "cancelled"] as const;
export const RESULT_SOURCES = ["import", "manual", "api"] as const;
export const IMPORT_STATUS = ["completed", "rolled_back", "failed"] as const;

/* ---------- System columns (every tab) ---------- */
export const systemShape = {
  created_at: zStr,
  updated_at: zStr,
  created_by: zStr,
  is_deleted: zBool,
};
export const SYSTEM_COLUMNS = ["created_at", "updated_at", "created_by", "is_deleted"] as const;

/* ---------- Tables. Key order = column order in the sheet. ---------- */
export const CompanySchema = z.object({
  id: zStr,
  name_ar: zStr,
  name_en: zStr,
  logo_url: zStr,
  industry: zStr,
  currency: zStr,
  monthly_budget: zNum,
  status: zEnum([...COMPANY_STATUS], "active"),
  account_manager: zStr,
  notes: zStr,
  ...systemShape,
});

export const PlatformSchema = z.object({
  id: zStr,
  name: zStr,
  icon: zStr,
  is_active: zBool,
  ...systemShape,
});

export const AdAccountSchema = z.object({
  id: zStr,
  company_id: zStr,
  platform_id: zStr,
  account_name: zStr,
  external_account_id: zStr,
  ...systemShape,
});

export const CampaignSchema = z.object({
  id: zStr,
  company_id: zStr,
  platform_id: zStr,
  ad_account_id: zStr,
  name: zStr,
  objective: zEnum([...CAMPAIGN_OBJECTIVES], "Leads"),
  start_date: zDate,
  end_date: zDate,
  budget_type: zEnum([...BUDGET_TYPES], "daily"),
  budget: zNum,
  status: zEnum([...CAMPAIGN_STATUS], "planned"),
  media_buyer: zStr,
  external_campaign_id: zStr,
  notes: zStr,
  ...systemShape,
});

export const AdSetSchema = z.object({
  id: zStr,
  campaign_id: zStr,
  company_id: zStr,
  name: zStr,
  audience: zStr,
  placements: zStr,
  budget: zNum,
  status: zEnum([...CAMPAIGN_STATUS], "active"),
  external_adset_id: zStr,
  ...systemShape,
});

export const CreativeSchema = z.object({
  id: zStr,
  company_id: zStr,
  campaign_id: zStr,
  title: zStr,
  type: zEnum([...CREATIVE_TYPES], "image"),
  aspect_ratio: zEnum([...ASPECT_RATIOS], "1:1"),
  file_url: zStr,
  thumbnail_url: zStr,
  primary_text: zStr,
  headline: zStr,
  cta: zStr,
  designer: zStr,
  copywriter: zStr,
  status: zEnum([...CREATIVE_STATUS], "idea"),
  version: zNum,
  approved_by: zStr,
  approved_at: zStr,
  tags: zList,
  external_ad_id: zStr,
  ...systemShape,
});

export const CreativeVersionSchema = z.object({
  id: zStr,
  creative_id: zStr,
  version: zNum,
  file_url: zStr,
  thumbnail_url: zStr,
  revision_notes: zStr,
  review_status: zEnum(["pending", "approved", "changes_requested"], "pending"),
  reviewer: zStr,
  review_comment: zStr,
  reviewed_at: zStr,
  ...systemShape,
});

export const CreativeScheduleSchema = z.object({
  id: zStr,
  creative_id: zStr,
  company_id: zStr,
  platform_id: zStr,
  campaign_id: zStr,
  scheduled_date: zDate,
  scheduled_time: zStr,
  owner: zStr,
  status: zEnum([...SCHEDULE_STATUS], "scheduled"),
  published_at: zStr,
  notes: zStr,
  ...systemShape,
});

export const DailyResultSchema = z.object({
  id: zStr,
  row_key: zStr,
  date: zDate,
  company_id: zStr,
  platform_id: zStr,
  campaign_id: zStr,
  adset_id: zStr,
  ad_name: zStr,
  creative_id: zStr,
  spend: zNum,
  impressions: zNum,
  reach: zNum,
  frequency: zNum,
  clicks: zNum,
  link_clicks: zNum,
  ctr: zNum,
  cpc: zNum,
  cpm: zNum,
  results: zNum,
  result_type: zStr,
  cost_per_result: zNum,
  leads: zNum,
  messages: zNum,
  purchases: zNum,
  purchase_value: zNum,
  roas: zNum,
  video_views: zNum,
  video_3s_views: zNum,
  thruplay: zNum,
  engagement: zNum,
  import_batch_id: zStr,
  source: zEnum([...RESULT_SOURCES], "manual"),
  ...systemShape,
});

export const ImportBatchSchema = z.object({
  id: zStr,
  file_name: zStr,
  platform_id: zStr,
  company_id: zStr,
  date_from: zDate,
  date_to: zDate,
  rows_total: zNum,
  rows_inserted: zNum,
  rows_updated: zNum,
  rows_skipped: zNum,
  imported_by: zStr,
  imported_at: zStr,
  status: zEnum([...IMPORT_STATUS], "completed"),
  ...systemShape,
});

/** Previous values of each row an import touched, so rollback can restore them. */
export const ImportChangeSchema = z.object({
  id: zStr,
  batch_id: zStr,
  result_id: zStr,
  action: zEnum(["inserted", "updated"], "inserted"),
  previous_values: zStr, // JSON
  ...systemShape,
});

export const ColumnMappingSchema = z.object({
  id: zStr,
  platform_id: zStr,
  source_column: zStr,
  target_field: zStr,
  ...systemShape,
});

export const BudgetSchema = z.object({
  id: zStr,
  company_id: zStr,
  platform_id: zStr,
  month: zStr, // YYYY-MM
  planned_budget: zNum,
  ...systemShape,
});

export const TargetSchema = z.object({
  id: zStr,
  company_id: zStr,
  platform_id: zStr,
  month: zStr,
  target_leads: zNum,
  target_cpl: zNum,
  target_roas: zNum,
  target_spend: zNum,
  ...systemShape,
});

export const UserSchema = z.object({
  id: zStr,
  email: zStr,
  name: zStr,
  role: zEnum([...ROLES], "Viewer"),
  company_ids: zList, // "*" = all companies
  ...systemShape,
});

export const ActivityLogSchema = z.object({
  id: zStr,
  user: zStr,
  action: zStr,
  entity: zStr,
  entity_id: zStr,
  timestamp: zStr,
  details: zStr,
  ...systemShape,
});

export const SettingSchema = z.object({
  id: zStr,
  key: zStr,
  value: zStr,
  ...systemShape,
});

export const ShareLinkSchema = z.object({
  id: zStr,
  token: zStr,
  report_type: zStr,
  params: zStr, // JSON
  expires_at: zStr,
  ...systemShape,
});

export type Company = z.infer<typeof CompanySchema>;
export type Platform = z.infer<typeof PlatformSchema>;
export type AdAccount = z.infer<typeof AdAccountSchema>;
export type Campaign = z.infer<typeof CampaignSchema>;
export type AdSet = z.infer<typeof AdSetSchema>;
export type Creative = z.infer<typeof CreativeSchema>;
export type CreativeVersion = z.infer<typeof CreativeVersionSchema>;
export type CreativeSchedule = z.infer<typeof CreativeScheduleSchema>;
export type DailyResult = z.infer<typeof DailyResultSchema>;
export type ImportBatch = z.infer<typeof ImportBatchSchema>;
export type ImportChange = z.infer<typeof ImportChangeSchema>;
export type ColumnMapping = z.infer<typeof ColumnMappingSchema>;
export type Budget = z.infer<typeof BudgetSchema>;
export type Target = z.infer<typeof TargetSchema>;
export type User = z.infer<typeof UserSchema>;
export type ActivityLog = z.infer<typeof ActivityLogSchema>;
export type Setting = z.infer<typeof SettingSchema>;
export type ShareLink = z.infer<typeof ShareLinkSchema>;
