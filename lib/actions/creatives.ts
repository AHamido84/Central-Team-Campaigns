"use server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { can, ForbiddenError, type AuthUser } from "@/lib/auth/permissions";
import { authorize, getCurrentUser } from "@/lib/auth/session";
import { normalizeName } from "@/lib/import/normalize";
import { bulkUpdate, getAll, getById, insert, nowIso, softDelete, update } from "@/lib/sheets";
import { CREATIVE_STATUS, type Creative, type CreativeStatus } from "@/types/entities";
import { CreativeInput, CreativeReviewInput, CreativeVersionInput } from "@/types/forms";
import { toError, type ActionResult } from "./result";

function refresh(c: Pick<Creative, "id" | "company_id">) {
  revalidatePath("/creatives");
  revalidatePath(`/creatives/${c.id}`);
  revalidatePath(`/companies/${c.company_id}`);
}

/**
 * Who may move a creative to which status:
 * - approved: Admin / Manager (creative:approve)
 * - live / paused: anyone who manages creatives or campaigns, and only once it was approved
 * - everything else: creative:manage (Admin, Manager, Designer)
 */
function checkStatusChange(user: AuthUser, c: Pick<Creative, "company_id" | "approved_by" | "status">, next: CreativeStatus) {
  if (next === c.status) return;
  if (next === "approved") {
    if (!can(user, "creative:approve", c.company_id)) throw new ForbiddenError();
    return;
  }
  if (next === "live" || next === "paused") {
    if (!can(user, "creative:manage", c.company_id) && !can(user, "campaign:manage", c.company_id)) throw new ForbiddenError();
    if (!c.approved_by) throw new Error("notApproved");
    return;
  }
  if (!can(user, "creative:manage", c.company_id)) throw new ForbiddenError();
}

/** Links results rows of the same company whose ad name equals the title and that have no creative yet. (Meta ad ids are matched at import time.) */
async function autoLink(c: Creative) {
  const title = normalizeName(c.title);
  const rows = (await getAll("DailyResults")).filter(
    (r) => r.company_id === c.company_id && !r.creative_id && normalizeName(r.ad_name) === title,
  );
  if (rows.length) await bulkUpdate("DailyResults", rows.map((r) => ({ id: r.id, patch: { creative_id: c.id } })));
  return rows.length;
}

export async function saveCreative(id: string | null, input: unknown): Promise<ActionResult<{ creative: Creative; linked: number }>> {
  try {
    const data = CreativeInput.parse(input);
    const user = await authorize("creative:manage", data.company_id);
    if (data.campaign_id) {
      const camp = await getById("Campaigns", data.campaign_id);
      if (!camp || camp.company_id !== data.company_id) return { ok: false, error: "validation", fieldErrors: { campaign_id: "campaignMismatch" } };
    }
    let row: Creative | null;
    if (id) {
      const existing = await getById("Creatives", id);
      if (!existing) return { ok: false, error: "notFound" };
      await authorize("creative:manage", existing.company_id);
      checkStatusChange(user, existing, data.status);
      const approval = data.status === "approved" && existing.status !== "approved" ? { approved_by: user.email, approved_at: nowIso() } : {};
      row = await update("Creatives", id, { ...data, ...approval }, user.email);
    } else {
      if (data.status === "approved" || data.status === "live" || data.status === "paused") checkStatusChange(user, { company_id: data.company_id, approved_by: "", status: "idea" }, data.status);
      row = await insert("Creatives", { ...data, version: 1 }, user.email);
      if (row && data.file_url) await insert("CreativeVersions", { creative_id: row.id, version: 1, file_url: data.file_url, thumbnail_url: data.thumbnail_url, revision_notes: "", review_status: "pending" }, user.email);
    }
    if (!row) return { ok: false, error: "notFound" };
    const linked = await autoLink(row);
    await logActivity(user.email, id ? "update" : "create", "Creative", row.id, { name: row.title, status: row.status });
    refresh(row);
    return { ok: true, data: { creative: row, linked } };
  } catch (e) {
    return toError(e);
  }
}

export async function setCreativeStatus(id: string, status: string): Promise<ActionResult<null>> {
  try {
    if (!(CREATIVE_STATUS as readonly string[]).includes(status)) return { ok: false, error: "validation" };
    const c = await getById("Creatives", id);
    if (!c) return { ok: false, error: "notFound" };
    const user = await getCurrentUser();
    if (!user || !can(user, "creative:view", c.company_id)) throw new ForbiddenError();
    checkStatusChange(user, c, status as CreativeStatus);
    const approval = status === "approved" && c.status !== "approved" ? { approved_by: user.email, approved_at: nowIso() } : {};
    await update("Creatives", id, { status: status as CreativeStatus, ...approval }, user.email);
    await logActivity(user.email, status === "approved" ? "approve" : "update", "Creative", id, { name: c.title, status });
    refresh(c);
    return { ok: true, data: null };
  } catch (e) {
    return toError(e);
  }
}

export async function addCreativeVersion(creativeId: string, input: unknown): Promise<ActionResult<null>> {
  try {
    const data = CreativeVersionInput.parse(input);
    const c = await getById("Creatives", creativeId);
    if (!c) return { ok: false, error: "notFound" };
    const user = await authorize("creative:manage", c.company_id);
    const versions = (await getAll("CreativeVersions")).filter((v) => v.creative_id === creativeId);
    const next = Math.max(c.version || 0, ...versions.map((v) => v.version)) + 1;
    await insert("CreativeVersions", { creative_id: creativeId, version: next, ...data, review_status: "pending" }, user.email);
    await update("Creatives", creativeId, { version: next, status: "review", approved_by: "", approved_at: "", ...(data.file_url ? { file_url: data.file_url } : {}), ...(data.thumbnail_url ? { thumbnail_url: data.thumbnail_url } : {}) }, user.email);
    await logActivity(user.email, "create", "CreativeVersion", creativeId, { name: c.title, version: next });
    refresh(c);
    return { ok: true, data: null };
  } catch (e) {
    return toError(e);
  }
}

export async function reviewCreativeVersion(versionId: string, input: unknown): Promise<ActionResult<null>> {
  try {
    const data = CreativeReviewInput.parse(input);
    const v = await getById("CreativeVersions", versionId);
    if (!v) return { ok: false, error: "notFound" };
    const c = await getById("Creatives", v.creative_id);
    if (!c) return { ok: false, error: "notFound" };
    const user = await authorize("creative:approve", c.company_id);
    if (data.decision === "changes_requested" && !data.comment) return { ok: false, error: "validation", fieldErrors: { comment: "required" } };
    const now = nowIso();
    await update("CreativeVersions", versionId, { review_status: data.decision, reviewer: user.email, review_comment: data.comment, reviewed_at: now }, user.email);
    // Only the latest version decides the creative's status.
    if (v.version >= c.version) {
      await update("Creatives", c.id, data.decision === "approved" ? { status: "approved", approved_by: user.email, approved_at: now } : { status: "revisions", approved_by: "", approved_at: "" }, user.email);
    }
    await logActivity(user.email, data.decision === "approved" ? "approve" : "reject", "Creative", c.id, { name: c.title, version: v.version, comment: data.comment });
    refresh(c);
    return { ok: true, data: null };
  } catch (e) {
    return toError(e);
  }
}

export async function deleteCreative(id: string): Promise<ActionResult<null>> {
  try {
    const c = await getById("Creatives", id);
    if (!c) return { ok: false, error: "notFound" };
    const user = await authorize("creative:approve", c.company_id); // Admin / Manager
    await softDelete("Creatives", id, user.email);
    const linked = (await getAll("DailyResults")).filter((r) => r.creative_id === id);
    if (linked.length) await bulkUpdate("DailyResults", linked.map((r) => ({ id: r.id, patch: { creative_id: "" } })));
    await logActivity(user.email, "delete", "Creative", id, { name: c.title });
    refresh(c);
    return { ok: true, data: null };
  } catch (e) {
    return toError(e);
  }
}

/** Links the chosen ad names (results rows of the same company) to this creative. */
export async function linkAdsToCreative(creativeId: string, adNames: string[]): Promise<ActionResult<{ linked: number }>> {
  try {
    const c = await getById("Creatives", creativeId);
    if (!c) return { ok: false, error: "notFound" };
    const user = await getCurrentUser();
    if (!user || !(can(user, "creative:manage", c.company_id) || can(user, "campaign:manage", c.company_id))) throw new ForbiddenError();
    const names = new Set(adNames.map(normalizeName));
    const rows = (await getAll("DailyResults")).filter((r) => r.company_id === c.company_id && names.has(normalizeName(r.ad_name)) && r.creative_id !== creativeId);
    if (rows.length) await bulkUpdate("DailyResults", rows.map((r) => ({ id: r.id, patch: { creative_id: creativeId } })));
    await logActivity(user.email, "update", "Creative", creativeId, { name: c.title, linkedAds: adNames });
    refresh(c);
    return { ok: true, data: { linked: rows.length } };
  } catch (e) {
    return toError(e);
  }
}
