"use server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/auth/session";
import { getById, insert, softDelete, update } from "@/lib/sheets";
import { AdSetInput, CampaignInput } from "@/types/forms";
import type { AdSet, Campaign } from "@/types/entities";
import { toError, type ActionResult } from "./result";

async function checkAdAccount(adAccountId: string, companyId: string, platformId: string) {
  if (!adAccountId) return true;
  const acc = await getById("AdAccounts", adAccountId);
  return !!acc && acc.company_id === companyId && acc.platform_id === platformId;
}

export async function saveCampaign(id: string | null, input: unknown): Promise<ActionResult<Campaign>> {
  try {
    const data = CampaignInput.parse(input);
    const user = await authorize("campaign:manage", data.company_id);
    if (id) {
      const existing = await getById("Campaigns", id);
      if (!existing) return { ok: false, error: "notFound" };
      // Moving a campaign needs access to the old company too.
      await authorize("campaign:manage", existing.company_id);
    }
    if (!(await checkAdAccount(data.ad_account_id, data.company_id, data.platform_id))) {
      return { ok: false, error: "validation", fieldErrors: { ad_account_id: "adAccountMismatch" } };
    }
    const row = id ? await update("Campaigns", id, data, user.email) : await insert("Campaigns", data, user.email);
    if (!row) return { ok: false, error: "notFound" };
    await logActivity(user.email, id ? "update" : "create", "Campaign", row.id, { name: row.name, status: row.status });
    revalidatePath("/campaigns");
    revalidatePath(`/campaigns/${row.id}`);
    revalidatePath(`/companies/${row.company_id}`);
    return { ok: true, data: row };
  } catch (e) {
    return toError(e);
  }
}

export async function deleteCampaign(id: string): Promise<ActionResult<null>> {
  try {
    const c = await getById("Campaigns", id);
    if (!c) return { ok: false, error: "notFound" };
    const user = await authorize("company:manage", c.company_id); // Admin / Manager only
    await softDelete("Campaigns", id, user.email);
    await logActivity(user.email, "delete", "Campaign", id, { name: c.name });
    revalidatePath("/campaigns");
    return { ok: true, data: null };
  } catch (e) {
    return toError(e);
  }
}

export async function saveAdSet(id: string | null, input: unknown): Promise<ActionResult<AdSet>> {
  try {
    const data = AdSetInput.parse(input);
    const campaign = await getById("Campaigns", data.campaign_id);
    if (!campaign) return { ok: false, error: "notFound" };
    const user = await authorize("campaign:manage", campaign.company_id);
    const payload = { ...data, company_id: campaign.company_id };
    const row = id ? await update("AdSets", id, payload, user.email) : await insert("AdSets", payload, user.email);
    if (!row) return { ok: false, error: "notFound" };
    await logActivity(user.email, id ? "update" : "create", "AdSet", row.id, { name: row.name, campaign_id: row.campaign_id });
    revalidatePath(`/campaigns/${campaign.id}`);
    return { ok: true, data: row };
  } catch (e) {
    return toError(e);
  }
}

export async function deleteAdSet(id: string): Promise<ActionResult<null>> {
  try {
    const a = await getById("AdSets", id);
    if (!a) return { ok: false, error: "notFound" };
    const user = await authorize("campaign:manage", a.company_id);
    await softDelete("AdSets", id, user.email);
    await logActivity(user.email, "delete", "AdSet", id);
    revalidatePath(`/campaigns/${a.campaign_id}`);
    return { ok: true, data: null };
  } catch (e) {
    return toError(e);
  }
}
