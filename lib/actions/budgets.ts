"use server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/auth/session";
import { getAll, insert, softDelete, update } from "@/lib/sheets";
import { MonthPlanInput } from "@/types/forms";
import { toError, type ActionResult } from "./result";

function refresh(companyId: string) {
  revalidatePath("/budgets");
  revalidatePath("/");
  revalidatePath(`/companies/${companyId}`);
}

/** Upserts one company's monthly budget per platform and its company-wide target. */
export async function saveMonthPlan(companyId: string, input: unknown): Promise<ActionResult<null>> {
  try {
    const data = MonthPlanInput.parse(input);
    const user = await authorize("budget:manage", companyId);
    const [budgets, targets, platforms] = await Promise.all([getAll("Budgets"), getAll("Targets"), getAll("Platforms")]);
    const valid = new Set(platforms.map((p) => p.id));
    const existing = budgets.filter((b) => b.company_id === companyId && b.month === data.month);
    for (const [platformId, amount] of Object.entries(data.budgets)) {
      if (!valid.has(platformId)) continue;
      const row = existing.find((b) => b.platform_id === platformId);
      if (row) {
        if (amount === 0) await softDelete("Budgets", row.id, user.email);
        else if (row.planned_budget !== amount) await update("Budgets", row.id, { planned_budget: amount }, user.email);
      } else if (amount > 0) {
        await insert("Budgets", { company_id: companyId, platform_id: platformId, month: data.month, planned_budget: amount }, user.email);
      }
    }
    const t = targets.find((x) => x.company_id === companyId && x.month === data.month && !x.platform_id);
    const target = { target_leads: data.target_leads, target_cpl: data.target_cpl, target_roas: data.target_roas, target_spend: data.target_spend };
    if (t) await update("Targets", t.id, target, user.email);
    else if (Object.values(target).some((v) => v > 0)) await insert("Targets", { company_id: companyId, platform_id: "", month: data.month, ...target }, user.email);
    await logActivity(user.email, "update", "Budget", companyId, { month: data.month, total: Object.values(data.budgets).reduce((s, v) => s + v, 0) });
    refresh(companyId);
    return { ok: true, data: null };
  } catch (e) {
    return toError(e);
  }
}

/** Copies last month's budgets and targets into this month, for companies that have none yet. */
export async function copyPreviousMonth(month: string, companyIds: string[]): Promise<ActionResult<{ copied: number }>> {
  try {
    if (!/^\d{4}-\d{2}$/.test(month)) return { ok: false, error: "validation" };
    const [y, m] = month.split("-").map(Number);
    const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
    const [budgets, targets] = await Promise.all([getAll("Budgets"), getAll("Targets")]);
    let copied = 0;
    let actor = "";
    for (const companyId of companyIds) {
      const user = await authorize("budget:manage", companyId);
      actor = user.email;
      if (budgets.some((b) => b.company_id === companyId && b.month === month)) continue;
      for (const b of budgets.filter((x) => x.company_id === companyId && x.month === prev)) {
        await insert("Budgets", { company_id: companyId, platform_id: b.platform_id, month, planned_budget: b.planned_budget }, user.email);
      }
      const t = targets.find((x) => x.company_id === companyId && x.month === prev && !x.platform_id);
      if (t && !targets.some((x) => x.company_id === companyId && x.month === month && !x.platform_id)) {
        await insert("Targets", { company_id: companyId, platform_id: "", month, target_leads: t.target_leads, target_cpl: t.target_cpl, target_roas: t.target_roas, target_spend: t.target_spend }, user.email);
      }
      copied++;
      refresh(companyId);
    }
    if (actor) await logActivity(actor, "create", "Budget", month, { copiedFrom: prev, companies: copied });
    return { ok: true, data: { copied } };
  } catch (e) {
    return toError(e);
  }
}
