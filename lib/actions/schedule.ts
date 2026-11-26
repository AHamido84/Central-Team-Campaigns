"use server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { can, ForbiddenError } from "@/lib/auth/permissions";
import { authorize, getCurrentUser } from "@/lib/auth/session";
import { getById, insert, nowIso, update } from "@/lib/sheets";
import { ScheduleInput } from "@/types/forms";
import type { CreativeSchedule } from "@/types/entities";
import { toError, type ActionResult } from "./result";

function refresh(companyId: string) {
  revalidatePath("/schedule");
  revalidatePath("/");
  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/creatives");
}

export async function saveScheduleEntry(id: string | null, input: unknown): Promise<ActionResult<CreativeSchedule>> {
  try {
    const data = ScheduleInput.parse(input);
    const creative = await getById("Creatives", data.creative_id);
    if (!creative) return { ok: false, error: "validation", fieldErrors: { creative_id: "required" } };
    const user = await authorize("schedule:manage", creative.company_id);
    if (data.campaign_id) {
      const camp = await getById("Campaigns", data.campaign_id);
      if (!camp || camp.company_id !== creative.company_id) return { ok: false, error: "validation", fieldErrors: { campaign_id: "campaignMismatch" } };
    }
    if (id) {
      const existing = await getById("CreativeSchedule", id);
      if (!existing) return { ok: false, error: "notFound" };
      await authorize("schedule:manage", existing.company_id);
    }
    const published = data.status === "published" ? { published_at: nowIso() } : { published_at: "" };
    const row = id
      ? await update("CreativeSchedule", id, { ...data, company_id: creative.company_id, ...published }, user.email)
      : await insert("CreativeSchedule", { ...data, company_id: creative.company_id, ...published }, user.email);
    if (!row) return { ok: false, error: "notFound" };
    await logActivity(user.email, id ? "update" : "create", "Schedule", row.id, { name: creative.title, date: row.scheduled_date });
    refresh(row.company_id);
    return { ok: true, data: row };
  } catch (e) {
    return toError(e);
  }
}

/** Media buyers publish ads, so they may mark posts published as well as schedule managers. */
export async function setScheduleStatus(id: string, status: "published" | "cancelled" | "scheduled"): Promise<ActionResult<{ creativeLive: boolean }>> {
  try {
    const e = await getById("CreativeSchedule", id);
    if (!e) return { ok: false, error: "notFound" };
    const user = await getCurrentUser();
    const allowed = can(user, "schedule:manage", e.company_id) || (status === "published" && can(user, "campaign:manage", e.company_id));
    if (!user || !allowed) throw new ForbiddenError();
    await update("CreativeSchedule", id, { status, published_at: status === "published" ? nowIso() : "" }, user.email);
    // Publishing an approved creative makes it live.
    let creativeLive = false;
    if (status === "published") {
      const c = await getById("Creatives", e.creative_id);
      if (c && c.approved_by && (c.status === "approved" || c.status === "paused")) {
        await update("Creatives", c.id, { status: "live" }, user.email);
        creativeLive = true;
      }
    }
    await logActivity(user.email, status === "published" ? "publish" : "update", "Schedule", id, { status });
    refresh(e.company_id);
    return { ok: true, data: { creativeLive } };
  } catch (err) {
    return toError(err);
  }
}

export async function rescheduleEntry(id: string, date: string): Promise<ActionResult<null>> {
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "validation" };
    const e = await getById("CreativeSchedule", id);
    if (!e) return { ok: false, error: "notFound" };
    const user = await authorize("schedule:manage", e.company_id);
    await update("CreativeSchedule", id, { scheduled_date: date, ...(e.status === "late" ? { status: "scheduled" as const } : {}) }, user.email);
    await logActivity(user.email, "update", "Schedule", id, { from: e.scheduled_date, to: date });
    refresh(e.company_id);
    return { ok: true, data: null };
  } catch (err) {
    return toError(err);
  }
}
