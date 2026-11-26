"use server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/auth/session";
import { commitImport, ImportError, previewImport, rollbackImport, type CampaignResolution, type CommitResult, type ImportPayload, type PreviewResult } from "@/lib/import/service";
import { rowKey } from "@/lib/import/row-key";
import { getById, upsertMany } from "@/lib/sheets";
import { metricsOf } from "@/lib/metrics";
import { ManualResultInput } from "@/types/forms-results";
import { toError, type ActionResult } from "./result";

function importError(e: unknown): ActionResult<never> {
  if (e instanceof ImportError) return { ok: false, error: e.message };
  return toError(e);
}

const MAX_ROWS = 20_000;

function checkSize(p: ImportPayload) {
  if (!Array.isArray(p.rows) || !Array.isArray(p.headers)) throw new ImportError("badFile");
  if (p.rows.length > MAX_ROWS) throw new ImportError("tooManyRows");
}

export async function previewImportAction(p: ImportPayload): Promise<ActionResult<PreviewResult>> {
  try {
    await authorize("results:import", p.companyId);
    checkSize(p);
    return { ok: true, data: await previewImport(p) };
  } catch (e) {
    return importError(e);
  }
}

export async function commitImportAction(p: ImportPayload & { resolutions: Record<string, CampaignResolution>; saveMapping: boolean }): Promise<ActionResult<CommitResult>> {
  try {
    const user = await authorize("results:import", p.companyId);
    checkSize(p);
    const res = await commitImport(p, user);
    await logActivity(user.email, "import", "ImportBatch", res.batchId, { file: p.fileName, ...res });
    revalidatePath("/import/history");
    revalidatePath("/campaigns");
    revalidatePath("/");
    return { ok: true, data: res };
  } catch (e) {
    return importError(e);
  }
}

export async function rollbackImportAction(batchId: string): Promise<ActionResult<{ removed: number; restored: number }>> {
  try {
    const batch = await getById("ImportBatches", batchId);
    if (!batch) return { ok: false, error: "notFound" };
    const user = await authorize("results:import", batch.company_id);
    const res = await rollbackImport(batchId, user.email);
    await logActivity(user.email, "rollback", "ImportBatch", batchId, res);
    revalidatePath("/import/history");
    revalidatePath("/campaigns");
    revalidatePath("/");
    return { ok: true, data: res };
  } catch (e) {
    return importError(e);
  }
}

/** Manual entry uses the same unique key as imports, so it updates instead of duplicating. */
export async function saveManualResult(input: unknown): Promise<ActionResult<{ updated: boolean }>> {
  try {
    const d = ManualResultInput.parse(input);
    const user = await authorize("results:import", d.company_id);
    const campaign = await getById("Campaigns", d.campaign_id);
    if (!campaign || campaign.company_id !== d.company_id || campaign.platform_id !== d.platform_id) {
      return { ok: false, error: "validation", fieldErrors: { campaign_id: "campaignMismatch" } };
    }
    if (d.adset_id) {
      const a = await getById("AdSets", d.adset_id);
      if (!a || a.campaign_id !== d.campaign_id) return { ok: false, error: "validation", fieldErrors: { adset_id: "required" } };
    }
    const m = metricsOf([d]);
    const row = {
      ...d,
      row_key: rowKey(d),
      ctr: m.link_clicks ? (m.link_ctr ?? 0) : (m.ctr ?? 0),
      cpc: (m.link_clicks ? m.cost_per_link_click : m.cpc) ?? 0,
      cpm: m.cpm ?? 0,
      frequency: m.frequency ?? 0,
      cost_per_result: m.cost_per_result ?? 0,
      roas: m.roas ?? 0,
      source: "manual" as const,
      import_batch_id: "",
      creative_id: "",
    };
    const res = await upsertMany("DailyResults", "row_key", [row], user.email);
    const id = res.inserted[0]?.id ?? res.updated[0]?.row.id;
    await logActivity(user.email, res.updated.length ? "update" : "create", "DailyResult", id, { date: d.date, campaign_id: d.campaign_id, spend: d.spend });
    revalidatePath("/campaigns");
    revalidatePath("/");
    return { ok: true, data: { updated: res.updated.length > 0 } };
  } catch (e) {
    return toError(e);
  }
}
