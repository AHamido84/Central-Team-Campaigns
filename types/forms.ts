import { z } from "zod";
import { BUDGET_TYPES, CAMPAIGN_OBJECTIVES, CAMPAIGN_STATUS, COMPANY_STATUS } from "./entities";

/**
 * Form schemas, shared by the browser (react-hook-form) and the Server
 * Actions. Error messages are translation keys under "validation.*".
 */
const req = (min = 1) => z.string().trim().min(min, "required");
const opt = z.string().trim().max(2000, "tooLong").default("");
const money = z.coerce.number({ error: "number" }).min(0, "positive").default(0);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date");
const optDate = z.union([isoDate, z.literal("")]).default("");
const optUrl = z.union([z.string().trim().url("url"), z.literal("")]).default("");

export const CompanyInput = z.object({
  name_ar: req(2),
  name_en: opt,
  logo_url: optUrl,
  industry: opt,
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "currency").default("SAR"),
  monthly_budget: money,
  status: z.enum(COMPANY_STATUS).default("active"),
  account_manager: opt,
  notes: opt,
});

export const PlatformInput = z.object({
  name: req(),
  icon: opt,
  is_active: z.coerce.boolean().default(true),
});

export const AdAccountInput = z.object({
  company_id: req(),
  platform_id: req(),
  account_name: req(),
  external_account_id: opt,
});

export const CampaignInput = z
  .object({
    company_id: req(),
    platform_id: req(),
    ad_account_id: opt,
    name: req(2),
    objective: z.enum(CAMPAIGN_OBJECTIVES),
    start_date: optDate,
    end_date: optDate,
    budget_type: z.enum(BUDGET_TYPES),
    budget: money,
    status: z.enum(CAMPAIGN_STATUS),
    media_buyer: opt,
    external_campaign_id: opt,
    notes: opt,
  })
  .refine((v) => !v.start_date || !v.end_date || v.end_date >= v.start_date, { path: ["end_date"], message: "endBeforeStart" });

export const AdSetInput = z.object({
  campaign_id: req(),
  name: req(),
  audience: opt,
  placements: opt,
  budget: money,
  status: z.enum(CAMPAIGN_STATUS).default("active"),
  external_adset_id: opt,
});

export type CompanyInputT = z.output<typeof CompanyInput>;
export type PlatformInputT = z.output<typeof PlatformInput>;
export type AdAccountInputT = z.output<typeof AdAccountInput>;
export type CampaignInputT = z.output<typeof CampaignInput>;
export type AdSetInputT = z.output<typeof AdSetInput>;
