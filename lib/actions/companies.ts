"use server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/auth/session";
import { insert, update, getById, getAll, softDelete } from "@/lib/sheets";
import { AdAccountInput, CompanyInput, PlatformInput } from "@/types/forms";
import type { AdAccount, Company, Platform } from "@/types/entities";
import { toError, type ActionResult } from "./result";

export async function createCompany(input: unknown): Promise<ActionResult<Company>> {
  try {
    const user = await authorize("company:manage");
    const data = CompanyInput.parse(input);
    const row = await insert("Companies", data, user.email);
    await logActivity(user.email, "create", "Company", row.id, { name: row.name_ar });
    revalidatePath("/companies");
    return { ok: true, data: row };
  } catch (e) {
    return toError(e);
  }
}

export async function updateCompany(id: string, input: unknown): Promise<ActionResult<Company>> {
  try {
    const user = await authorize("company:manage", id);
    const data = CompanyInput.parse(input);
    const row = await update("Companies", id, data, user.email);
    if (!row) return { ok: false, error: "notFound" };
    await logActivity(user.email, "update", "Company", id, data);
    revalidatePath("/companies");
    revalidatePath(`/companies/${id}`);
    return { ok: true, data: row };
  } catch (e) {
    return toError(e);
  }
}

/** Archive keeps all history; the company just leaves the active lists. */
export async function setCompanyArchived(id: string, archived: boolean): Promise<ActionResult<Company>> {
  try {
    const user = await authorize("company:manage", id);
    const row = await update("Companies", id, { status: archived ? "archived" : "active" }, user.email);
    if (!row) return { ok: false, error: "notFound" };
    await logActivity(user.email, archived ? "archive" : "restore", "Company", id);
    revalidatePath("/companies");
    revalidatePath(`/companies/${id}`);
    return { ok: true, data: row };
  } catch (e) {
    return toError(e);
  }
}

/* ---------- Ad accounts ---------- */

export async function saveAdAccount(id: string | null, input: unknown): Promise<ActionResult<AdAccount>> {
  try {
    const data = AdAccountInput.parse(input);
    const user = await authorize("campaign:manage", data.company_id);
    if (id) {
      const existing = await getById("AdAccounts", id);
      if (!existing || existing.company_id !== data.company_id) return { ok: false, error: "notFound" };
    }
    const row = id ? await update("AdAccounts", id, data, user.email) : await insert("AdAccounts", data, user.email);
    if (!row) return { ok: false, error: "notFound" };
    await logActivity(user.email, id ? "update" : "create", "AdAccount", row.id, data);
    revalidatePath(`/companies/${data.company_id}`);
    return { ok: true, data: row };
  } catch (e) {
    return toError(e);
  }
}

export async function deleteAdAccount(id: string): Promise<ActionResult<null>> {
  try {
    const acc = await getById("AdAccounts", id);
    if (!acc) return { ok: false, error: "notFound" };
    const user = await authorize("campaign:manage", acc.company_id);
    const inUse = (await getAll("Campaigns")).some((c) => c.ad_account_id === id);
    if (inUse) return { ok: false, error: "adAccountInUse" };
    await softDelete("AdAccounts", id, user.email);
    await logActivity(user.email, "delete", "AdAccount", id);
    revalidatePath(`/companies/${acc.company_id}`);
    return { ok: true, data: null };
  } catch (e) {
    return toError(e);
  }
}

/* ---------- Platforms (Admin) ---------- */

export async function savePlatform(id: string | null, input: unknown): Promise<ActionResult<Platform>> {
  try {
    const user = await authorize("settings:manage");
    const data = PlatformInput.parse(input);
    const dup = (await getAll("Platforms")).find((p) => p.name.toLowerCase() === data.name.toLowerCase() && p.id !== id);
    if (dup) return { ok: false, error: "validation", fieldErrors: { name: "duplicate" } };
    const row = id ? await update("Platforms", id, data, user.email) : await insert("Platforms", data, user.email);
    if (!row) return { ok: false, error: "notFound" };
    await logActivity(user.email, id ? "update" : "create", "Platform", row.id, data);
    revalidatePath("/settings/platforms");
    return { ok: true, data: row };
  } catch (e) {
    return toError(e);
  }
}
