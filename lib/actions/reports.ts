"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { can, ForbiddenError } from "@/lib/auth/permissions";
import { authorize } from "@/lib/auth/session";
import { assertCanRunReport } from "@/lib/data/reports";
import { parseReportParams } from "@/lib/reports/params";
import { createLink, revokeLink } from "@/lib/reports/share";
import { getById } from "@/lib/sheets";
import { toError, type ActionResult } from "./result";

export async function createShareLinkAction(query: string, days: number, fixedDates: boolean): Promise<ActionResult<{ url: string; expires: string }>> {
  try {
    const user = await authorize("report:share");
    const p = parseReportParams(Object.fromEntries(new URLSearchParams(query)));
    assertCanRunReport(user, p);
    const d = [1, 7, 30, 90].includes(days) ? days : 7;
    const link = await createLink(user, p, { days: d, fixedDates });
    const h = await headers();
    const origin = process.env.APP_URL?.replace(/\/$/, "") || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
    await logActivity(user.email, "create", "ShareLink", link.id, { type: p.type, days: d });
    revalidatePath("/reports");
    return { ok: true, data: { url: `${origin}/share/${link.token}`, expires: link.expires_at } };
  } catch (e) {
    return toError(e);
  }
}

export async function revokeShareLinkAction(id: string): Promise<ActionResult<null>> {
  try {
    const user = await authorize("report:share");
    const link = await getById("ShareLinks", id);
    if (!link) return { ok: false, error: "notFound" };
    if (link.created_by !== user.email && !can(user, "user:manage")) throw new ForbiddenError();
    await revokeLink(id, user.email);
    await logActivity(user.email, "delete", "ShareLink", id);
    revalidatePath("/reports");
    return { ok: true, data: null };
  } catch (e) {
    return toError(e);
  }
}
