import { z } from "zod";

const n = z.coerce.number({ error: "number" }).min(0, "positive").default(0);

/** Manual daily results entry (platforms without an export file). */
export const ManualResultInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date"),
  company_id: z.string().min(1, "required"),
  platform_id: z.string().min(1, "required"),
  campaign_id: z.string().min(1, "required"),
  adset_id: z.string().default(""),
  ad_name: z.string().trim().max(300, "tooLong").default(""),
  spend: n,
  impressions: n,
  reach: n,
  clicks: n,
  link_clicks: n,
  results: n,
  result_type: z.string().trim().max(100, "tooLong").default(""),
  leads: n,
  messages: n,
  purchases: n,
  purchase_value: n,
  video_views: n,
  video_3s_views: n,
  thruplay: n,
  engagement: n,
});
export type ManualResultInputT = z.output<typeof ManualResultInput>;
