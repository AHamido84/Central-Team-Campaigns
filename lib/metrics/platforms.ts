import type { MetricKey } from "./index";

/**
 * Which metrics each platform's campaign page shows, and label overrides
 * (Google calls results "Conversions" and cost per result "CPA").
 * Label values are keys under "metrics.*" in messages/*.json.
 */
export interface PlatformMetricConfig {
  kpis: MetricKey[];
  labels?: Partial<Record<MetricKey, string>>;
}

const BASE: MetricKey[] = ["spend", "impressions", "reach", "link_clicks", "link_ctr", "cpc", "cpm"];

export const PLATFORM_METRICS: Record<string, PlatformMetricConfig> = {
  meta: { kpis: [...BASE, "frequency", "results", "cost_per_result", "leads", "cpl", "messages", "purchases", "roas", "hook_rate", "hold_rate"] },
  tiktok: { kpis: [...BASE, "video_views", "video_3s_views", "thruplay", "hook_rate", "hold_rate", "results", "cost_per_result"], labels: { video_3s_views: "video_2s_6s" } },
  snapchat: { kpis: [...BASE, "frequency", "video_views", "results", "cost_per_result", "leads", "cpl"] },
  "google ads": { kpis: ["spend", "impressions", "clicks", "ctr", "cpc", "results", "cost_per_result", "purchase_value", "roas"], labels: { results: "conversions", cost_per_result: "cpa" } },
  youtube: { kpis: ["spend", "impressions", "video_views", "thruplay", "cpm", "results", "cost_per_result"] },
};

export const DEFAULT_PLATFORM_METRICS: PlatformMetricConfig = { kpis: [...BASE, "results", "cost_per_result", "leads", "cpl"] };

export function platformMetrics(platformName: string): PlatformMetricConfig {
  return PLATFORM_METRICS[platformName.trim().toLowerCase()] ?? DEFAULT_PLATFORM_METRICS;
}

/** KPI cards on the overview dashboard. */
export const DASHBOARD_KPIS: MetricKey[] = ["spend", "impressions", "reach", "clicks", "ctr", "cpc", "cpm", "results", "cost_per_result", "leads", "cpl", "purchases", "roas"];

export const CURRENCY_METRICS = new Set<MetricKey>(["spend", "cpc", "cost_per_link_click", "cpm", "cost_per_result", "cpl", "cost_per_message", "cost_per_purchase", "purchase_value"]);
export const PERCENT_METRICS = new Set<MetricKey>(["ctr", "link_ctr", "hook_rate", "hold_rate"]);
export const RATIO_METRICS = new Set<MetricKey>(["roas", "frequency"]);
