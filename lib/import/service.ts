import { bulkInsert, bulkUpdate, getAll, getById, insert, newId, nowIso, restoreRows, update, upsertMany } from "@/lib/sheets/repository";
import type { AuthUser } from "@/lib/auth/permissions";
import type { Campaign, DailyResult } from "@/types/entities";
import { adapterFor } from "./adapters";
import { TARGET_FIELDS, type ColumnMapping, type TargetField } from "./fields";
import { normalizeName } from "./normalize";
import { rowKey } from "./row-key";
import { detectLevel, isValid, missingRequired, rowDerived, transformRows, type Cell, type ImportRow } from "./transform";

export interface ImportPayload {
  companyId: string;
  platformId: string;
  fileName: string;
  headers: string[];
  rows: Cell[][];
  mapping: ColumnMapping;
}

export type CampaignResolution = { mode: "create" } | { mode: "link"; campaignId: string };

export interface DetectedCampaign {
  key: string;
  name: string;
  externalId: string;
  rows: number;
  spend: number;
  match: { id: string; name: string } | null;
}

export interface PreviewResult {
  level: "campaign" | "adset" | "ad";
  totalRows: number;
  validRows: number;
  skippedRows: number;
  duplicateRowsInFile: number;
  dateFrom: string;
  dateTo: string;
  totalSpend: number;
  toInsert: number;
  toUpdate: number;
  campaigns: DetectedCampaign[];
  existingCampaigns: { id: string; name: string }[];
  issues: { line: number; issues: string[] }[];
  sample: ImportRow[];
  warnings: string[];
}

export class ImportError extends Error {}

const campaignKey = (r: Pick<ImportRow, "campaign_external_id" | "campaign_name">) =>
  r.campaign_external_id ? `id:${r.campaign_external_id}` : `name:${normalizeName(r.campaign_name)}`;

async function loadContext(p: ImportPayload) {
  const [platform, company] = await Promise.all([getById("Platforms", p.platformId), getById("Companies", p.companyId)]);
  if (!platform) throw new ImportError("platformNotFound");
  if (!company) throw new ImportError("companyNotFound");
  const valid = new Set<string>(TARGET_FIELDS);
  for (const v of Object.values(p.mapping)) if (v && !valid.has(v)) throw new ImportError("badMapping");
  const missing = missingRequired(p.mapping);
  if (missing.length) throw new ImportError(`missingFields:${missing.join(",")}`);
  const adapter = adapterFor(platform.name);
  const { rows, ignored } = transformRows(p.headers, p.rows, p.mapping, adapter);
  const campaigns = (await getAll("Campaigns")).filter((c) => c.company_id === p.companyId && c.platform_id === p.platformId);
  return { platform, company, rows, ignored, campaigns };
}

function matchCampaign(r: ImportRow, campaigns: Campaign[]): Campaign | undefined {
  if (r.campaign_external_id) {
    const byId = campaigns.find((c) => c.external_campaign_id && c.external_campaign_id === r.campaign_external_id);
    if (byId) return byId;
  }
  const n = normalizeName(r.campaign_name);
  return n ? campaigns.find((c) => normalizeName(c.name) === n) : undefined;
}

/** Last row wins when the same day/campaign/ad set/ad appears twice in one file. */
function dedupeKey(r: ImportRow) {
  return [r.date, campaignKey(r), r.adset_external_id || normalizeName(r.adset_name), r.ad_external_id || normalizeName(r.ad_name)].join("|");
}

export async function previewImport(p: ImportPayload): Promise<PreviewResult> {
  const { rows, ignored, campaigns } = await loadContext(p);
  const valid = rows.filter(isValid);
  const unique = new Map<string, ImportRow>();
  for (const r of valid) unique.set(dedupeKey(r), r);

  const detected = new Map<string, DetectedCampaign>();
  for (const r of valid) {
    const k = campaignKey(r);
    const d = detected.get(k) ?? { key: k, name: r.campaign_name, externalId: r.campaign_external_id, rows: 0, spend: 0, match: null };
    d.rows++;
    d.spend += r.spend;
    if (!d.match) {
      const m = matchCampaign(r, campaigns);
      if (m) d.match = { id: m.id, name: m.name };
    }
    detected.set(k, d);
  }

  // Estimate inserts vs updates using the same keys the commit will use.
  const existing = (await getAll("DailyResults", { includeDeleted: true })).filter((r) => r.company_id === p.companyId && r.platform_id === p.platformId);
  const existingKeys = new Set(existing.filter((r) => !r.is_deleted).map((r) => r.row_key));
  const adsets = await getAll("AdSets");
  let toUpdate = 0;
  for (const r of unique.values()) {
    const c = matchCampaign(r, campaigns);
    if (!c) continue;
    const a = findAdSet(adsets, c.id, r);
    if (r.adset_name && !a) continue;
    if (existingKeys.has(rowKey({ date: r.date, company_id: p.companyId, platform_id: p.platformId, campaign_id: c.id, adset_id: a?.id ?? "", ad_name: r.ad_name }))) toUpdate++;
  }

  // Mixing levels (e.g. campaign totals and ad rows for the same day) would double count.
  const level = detectLevel(p.mapping);
  const warnings: string[] = [];
  const dates = [...unique.values()].map((r) => r.date).sort();
  const matchedIds = new Set([...detected.values()].map((d) => d.match?.id).filter(Boolean));
  const otherLevel = existing.some((e) => {
    if (e.is_deleted || !matchedIds.has(e.campaign_id) || e.date < dates[0] || e.date > dates[dates.length - 1]) return false;
    const eLevel = e.ad_name ? "ad" : e.adset_id ? "adset" : "campaign";
    return eLevel !== level;
  });
  if (otherLevel) warnings.push("levelMismatch");
  if (rows.some((r) => r.issues.includes("notDaily"))) warnings.push("notDaily");

  return {
    level,
    totalRows: rows.length + ignored,
    validRows: unique.size,
    skippedRows: rows.length - valid.length + ignored,
    duplicateRowsInFile: valid.length - unique.size,
    dateFrom: dates[0] ?? "",
    dateTo: dates[dates.length - 1] ?? "",
    totalSpend: Math.round([...unique.values()].reduce((s, r) => s + r.spend, 0) * 100) / 100,
    toInsert: unique.size - toUpdate,
    toUpdate,
    campaigns: [...detected.values()].sort((a, b) => b.spend - a.spend),
    existingCampaigns: campaigns.map((c) => ({ id: c.id, name: c.name })),
    issues: rows.filter((r) => r.issues.length).slice(0, 100).map((r) => ({ line: r.line, issues: r.issues })),
    sample: rows.slice(0, 20),
    warnings,
  };
}

function findAdSet<T extends { id: string; campaign_id: string; name: string; external_adset_id: string }>(adsets: T[], campaignId: string, r: ImportRow) {
  if (!r.adset_name && !r.adset_external_id) return undefined;
  return adsets.find(
    (a) => a.campaign_id === campaignId && ((r.adset_external_id && a.external_adset_id === r.adset_external_id) || normalizeName(a.name) === normalizeName(r.adset_name)),
  );
}

function guessObjective(resultType: string): Campaign["objective"] {
  const t = resultType.toLowerCase();
  if (/lead/.test(t)) return "Leads";
  if (/messag|conversation/.test(t)) return "Messages";
  if (/purchase|sale/.test(t)) return "Sales";
  if (/reach|impression|aware/.test(t)) return "Awareness";
  if (/engag/.test(t)) return "Engagement";
  return "Traffic";
}

export interface CommitResult {
  batchId: string;
  inserted: number;
  updated: number;
  skipped: number;
  campaignsCreated: number;
  adSetsCreated: number;
}

export async function commitImport(
  p: ImportPayload & { resolutions: Record<string, CampaignResolution>; saveMapping: boolean },
  user: AuthUser,
): Promise<CommitResult> {
  const { rows, ignored, campaigns } = await loadContext(p);
  const valid = rows.filter(isValid);
  const unique = new Map<string, ImportRow>();
  for (const r of valid) unique.set(dedupeKey(r), r);
  if (!unique.size) throw new ImportError("noValidRows");

  /* 1. Campaigns: matched, linked by the user, or created. */
  const byKey = new Map<string, string>();
  const toCreate = new Map<string, ImportRow[]>();
  for (const r of unique.values()) {
    const k = campaignKey(r);
    if (byKey.has(k) || toCreate.has(k)) {
      toCreate.get(k)?.push(r);
      continue;
    }
    const m = matchCampaign(r, campaigns);
    if (m) {
      byKey.set(k, m.id);
      continue;
    }
    const res = p.resolutions[k] ?? { mode: "create" };
    if (res.mode === "link") {
      const target = campaigns.find((c) => c.id === res.campaignId);
      if (!target) throw new ImportError("badLink");
      byKey.set(k, target.id);
    } else toCreate.set(k, [r]);
  }
  const created = await bulkInsert(
    "Campaigns",
    [...toCreate.entries()].map(([, rs]) => {
      const first = rs[0];
      const dates = rs.map((r) => r.date).sort();
      return {
        company_id: p.companyId,
        platform_id: p.platformId,
        name: first.campaign_name || first.campaign_external_id,
        external_campaign_id: first.campaign_external_id,
        objective: guessObjective(first.result_type),
        start_date: dates[0],
        budget_type: "daily" as const,
        status: "active" as const,
        media_buyer: user.role === "MediaBuyer" ? user.email : "",
        notes: `Auto-created from import: ${p.fileName}`,
      };
    }),
    user.email,
  );
  [...toCreate.keys()].forEach((k, i) => byKey.set(k, created[i].id));

  /* 2. Ad sets: find by external id or name inside the campaign, else create. */
  const adsets = (await getAll("AdSets")).map((a) => ({ id: a.id, campaign_id: a.campaign_id, name: a.name, external_adset_id: a.external_adset_id }));
  const newAdSets: { id: string; campaign_id: string; company_id: string; name: string; external_adset_id: string; status: "active" }[] = [];
  const adsetIdFor = (campaignId: string, r: ImportRow) => {
    if (!r.adset_name && !r.adset_external_id) return "";
    const found = findAdSet(adsets, campaignId, r);
    if (found) return found.id;
    const a = { id: newId(), campaign_id: campaignId, company_id: p.companyId, name: r.adset_name || r.adset_external_id, external_adset_id: r.adset_external_id, status: "active" as const };
    adsets.push(a);
    newAdSets.push(a);
    return a.id;
  };

  /* 3. Creatives: link by Meta ad id, else by ad name = creative title. */
  const creatives = (await getAll("Creatives")).filter((c) => c.company_id === p.companyId);
  const creativeFor = (r: ImportRow) =>
    (r.ad_external_id && creatives.find((c) => c.external_ad_id === r.ad_external_id)?.id) ||
    (r.ad_name && creatives.find((c) => normalizeName(c.title) === normalizeName(r.ad_name))?.id) ||
    "";

  const batchId = newId();
  const results: Partial<DailyResult>[] = [...unique.values()].map((r) => {
    const campaign_id = byKey.get(campaignKey(r))!;
    const adset_id = adsetIdFor(campaign_id, r);
    const derived = rowDerived(r);
    const out: Partial<DailyResult> = {
      row_key: rowKey({ date: r.date, company_id: p.companyId, platform_id: p.platformId, campaign_id, adset_id, ad_name: r.ad_name }),
      date: r.date,
      company_id: p.companyId,
      platform_id: p.platformId,
      campaign_id,
      adset_id,
      ad_name: r.ad_name,
      creative_id: creativeFor(r),
      result_type: r.result_type,
      import_batch_id: batchId,
      source: "import",
      ...derived,
    };
    for (const f of ["spend", "impressions", "reach", "clicks", "link_clicks", "results", "leads", "messages", "purchases", "purchase_value", "video_views", "video_3s_views", "thruplay", "engagement"] as const) {
      out[f] = r[f];
    }
    return out;
  });
  if (newAdSets.length) await bulkInsert("AdSets", newAdSets, user.email);

  /* 4. Upsert: same key = update, new key = insert. Never duplicates. */
  const res = await upsertMany("DailyResults", "row_key", results, user.email);

  /* 5. Remember what changed so the whole batch can be rolled back. */
  await bulkInsert(
    "ImportChanges",
    [
      ...res.inserted.map((r) => ({ batch_id: batchId, result_id: r.id, action: "inserted" as const, previous_values: "" })),
      ...res.updated.map((u) => ({ batch_id: batchId, result_id: u.row.id, action: "updated" as const, previous_values: JSON.stringify(u.previous) })),
    ],
    user.email,
  );

  const dates = [...unique.values()].map((r) => r.date).sort();
  const skipped = rows.length - valid.length + ignored + (valid.length - unique.size);
  await insert(
    "ImportBatches",
    {
      id: batchId,
      file_name: p.fileName,
      platform_id: p.platformId,
      company_id: p.companyId,
      date_from: dates[0],
      date_to: dates[dates.length - 1],
      rows_total: rows.length + ignored,
      rows_inserted: res.inserted.length,
      rows_updated: res.updated.length,
      rows_skipped: skipped,
      imported_by: user.email,
      imported_at: nowIso(),
      status: "completed",
    },
    user.email,
  );

  if (p.saveMapping) await saveColumnMapping(p.platformId, p.mapping, user.email);

  return { batchId, inserted: res.inserted.length, updated: res.updated.length, skipped, campaignsCreated: created.length, adSetsCreated: newAdSets.length };
}

export async function saveColumnMapping(platformId: string, mapping: ColumnMapping, actor: string) {
  const existing = (await getAll("ColumnMappings")).filter((m) => m.platform_id === platformId);
  const byCol = new Map(existing.map((m) => [m.source_column, m]));
  const inserts: { platform_id: string; source_column: string; target_field: string }[] = [];
  const updates: { id: string; patch: { target_field: string } }[] = [];
  for (const [col, target] of Object.entries(mapping) as [string, TargetField | ""][]) {
    const e = byCol.get(col);
    if (e) {
      if (e.target_field !== target) updates.push({ id: e.id, patch: { target_field: target } });
    } else if (target) inserts.push({ platform_id: platformId, source_column: col, target_field: target });
  }
  if (inserts.length) await bulkInsert("ColumnMappings", inserts, actor);
  if (updates.length) await bulkUpdate("ColumnMappings", updates);
}

/**
 * Undo a whole import: rows it inserted are removed (soft delete) and rows it
 * updated get their previous values back. Blocked if a later import changed
 * the same rows (roll that one back first).
 */
export async function rollbackImport(batchId: string, actor: string) {
  const batch = await getById("ImportBatches", batchId);
  if (!batch) throw new ImportError("notFound");
  if (batch.status === "rolled_back") throw new ImportError("alreadyRolledBack");
  const changes = await getAll("ImportChanges");
  const mine = changes.filter((c) => c.batch_id === batchId);
  const ids = new Set(mine.map((c) => c.result_id));
  const batches = await getAll("ImportBatches");
  const later = new Set(batches.filter((b) => b.status === "completed" && b.imported_at > batch.imported_at && b.id !== batchId).map((b) => b.id));
  const blockers = new Set(changes.filter((c) => later.has(c.batch_id) && ids.has(c.result_id)).map((c) => c.batch_id));
  if (blockers.size) {
    const names = batches.filter((b) => blockers.has(b.id)).map((b) => b.file_name);
    throw new ImportError(`rollbackBlocked:${names.join(", ")}`);
  }

  const inserted = mine.filter((c) => c.action === "inserted").map((c) => ({ id: c.result_id, patch: { is_deleted: true } }));
  const restored = mine.filter((c) => c.action === "updated" && c.previous_values).map((c) => JSON.parse(c.previous_values));
  if (inserted.length) await bulkUpdate("DailyResults", inserted);
  if (restored.length) await restoreRows("DailyResults", restored);
  await update("ImportBatches", batchId, { status: "rolled_back" }, actor);
  return { removed: inserted.length, restored: restored.length };
}
