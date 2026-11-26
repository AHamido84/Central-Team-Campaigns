import type { z } from "zod";
import * as E from "@/types/entities";

type AnyObject = z.ZodObject<z.ZodRawShape>;

export interface TableDef<S extends AnyObject = AnyObject> {
  name: string;
  schema: S;
  columns: string[];
}

function defineTable<S extends AnyObject>(name: string, schema: S): TableDef<S> {
  return { name, schema, columns: Object.keys(schema.shape) };
}

/** One tab per table. The object key is the tab name in the spreadsheet. */
export const TABLES = {
  Companies: defineTable("Companies", E.CompanySchema),
  Platforms: defineTable("Platforms", E.PlatformSchema),
  AdAccounts: defineTable("AdAccounts", E.AdAccountSchema),
  Campaigns: defineTable("Campaigns", E.CampaignSchema),
  AdSets: defineTable("AdSets", E.AdSetSchema),
  Creatives: defineTable("Creatives", E.CreativeSchema),
  CreativeVersions: defineTable("CreativeVersions", E.CreativeVersionSchema),
  CreativeSchedule: defineTable("CreativeSchedule", E.CreativeScheduleSchema),
  DailyResults: defineTable("DailyResults", E.DailyResultSchema),
  ImportBatches: defineTable("ImportBatches", E.ImportBatchSchema),
  ImportChanges: defineTable("ImportChanges", E.ImportChangeSchema),
  ColumnMappings: defineTable("ColumnMappings", E.ColumnMappingSchema),
  Budgets: defineTable("Budgets", E.BudgetSchema),
  Targets: defineTable("Targets", E.TargetSchema),
  Users: defineTable("Users", E.UserSchema),
  ActivityLog: defineTable("ActivityLog", E.ActivityLogSchema),
  Settings: defineTable("Settings", E.SettingSchema),
  ShareLinks: defineTable("ShareLinks", E.ShareLinkSchema),
} as const;

export type Tables = typeof TABLES;
export type TableName = keyof Tables;
export type RowOf<T extends TableName> = z.infer<Tables[T]["schema"]>;
export const TABLE_NAMES = Object.keys(TABLES) as TableName[];
