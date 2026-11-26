"use server";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/auth/session";
import { TARGET_FIELDS } from "@/lib/import/fields";
import { bulkInsert, bulkUpdate, getAll, getById, insert, softDelete, update } from "@/lib/sheets";
import { SETTING_DEFAULTS, type SettingKey } from "@/lib/settings";
import { ChangePasswordInput, PASSWORD_MIN, SettingsInput, UserInput } from "@/types/forms";
import { generatePassword, hashPassword, verifyPassword } from "@/lib/auth/password";
import { getCurrentUser } from "@/lib/auth/session";
import { toError, type ActionResult } from "./result";

/* ---------- Users and roles ---------- */

export async function saveUser(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await authorize("user:manage");
    const { password, ...data } = UserInput.parse(input);
    if (!id && !password) return { ok: false, error: "validation", fieldErrors: { password: "required" } };
    if (password && password.length < PASSWORD_MIN) return { ok: false, error: "validation", fieldErrors: { password: "passwordShort" } };
    const users = await getAll("Users");
    if (users.some((u) => u.email.toLowerCase() === data.email && u.id !== id)) return { ok: false, error: "validation", fieldErrors: { email: "duplicate" } };
    const company_ids = data.role === "Admin" || data.role === "Manager" || data.company_ids.includes("*") || !data.company_ids.length ? ["*"] : data.company_ids;
    if (id) {
      const current = users.find((u) => u.id === id);
      if (!current) return { ok: false, error: "notFound" };
      // You can't lock yourself out by removing your own Admin role.
      if (current.email.toLowerCase() === me.email && data.role !== "Admin") return { ok: false, error: "selfDemote" };
      if (current.role === "Admin" && data.role !== "Admin" && users.filter((u) => u.role === "Admin").length <= 1) return { ok: false, error: "lastAdmin" };
    }
    const patch = { ...data, company_ids, ...(password ? { password_hash: await hashPassword(password) } : {}) };
    const row = id ? await update("Users", id, patch, me.email) : await insert("Users", patch, me.email);
    if (!row) return { ok: false, error: "notFound" };
    // The log records that a password was set, never the password.
    await logActivity(me.email, id ? "update" : "create", "User", row.id, { email: data.email, role: data.role, passwordChanged: !!password });
    revalidatePath("/settings/users");
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    return toError(e);
  }
}

export async function suggestPassword(): Promise<string> {
  await authorize("user:manage");
  return generatePassword();
}

export async function removeUser(id: string): Promise<ActionResult<null>> {
  try {
    const me = await authorize("user:manage");
    const users = await getAll("Users");
    const u = users.find((x) => x.id === id);
    if (!u) return { ok: false, error: "notFound" };
    if (u.email.toLowerCase() === me.email) return { ok: false, error: "selfDelete" };
    if (u.role === "Admin" && users.filter((x) => x.role === "Admin").length <= 1) return { ok: false, error: "lastAdmin" };
    await softDelete("Users", id, me.email);
    await logActivity(me.email, "delete", "User", id, { email: u.email });
    revalidatePath("/settings/users");
    return { ok: true, data: null };
  } catch (e) {
    return toError(e);
  }
}

/* ---------- General settings and alert thresholds ---------- */

export async function saveSettings(input: unknown): Promise<ActionResult<null>> {
  try {
    const me = await authorize("settings:manage");
    const d = SettingsInput.parse(input);
    // CTR and "CPL over target" are typed as percents and stored as fractions.
    const values: Record<SettingKey, string> = {
      default_currency: d.default_currency,
      alert_frequency_max: String(d.alert_frequency_max),
      alert_ctr_min: String(+(d.alert_ctr_min / 100).toFixed(6)),
      alert_cpl_over_target_pct: String(+(d.alert_cpl_over_target_pct / 100).toFixed(6)),
      alert_zero_results_days: String(d.alert_zero_results_days),
      alert_no_import_days: String(d.alert_no_import_days),
    };
    const rows = await getAll("Settings");
    const byKey = new Map(rows.map((r) => [r.key, r]));
    const inserts: { key: string; value: string }[] = [];
    const updates: { id: string; patch: { value: string } }[] = [];
    for (const k of Object.keys(SETTING_DEFAULTS) as SettingKey[]) {
      const row = byKey.get(k);
      if (!row) inserts.push({ key: k, value: values[k] });
      else if (row.value !== values[k]) updates.push({ id: row.id, patch: { value: values[k] } });
    }
    if (inserts.length) await bulkInsert("Settings", inserts, me.email);
    if (updates.length) await bulkUpdate("Settings", updates);
    await logActivity(me.email, "update", "Settings", "general", values);
    revalidatePath("/", "layout");
    return { ok: true, data: null };
  } catch (e) {
    return toError(e);
  }
}

/* ---------- Saved import mappings ---------- */

export async function setMappingTarget(id: string, target: string): Promise<ActionResult<null>> {
  try {
    const me = await authorize("settings:manage");
    if (target && !(TARGET_FIELDS as readonly string[]).includes(target)) return { ok: false, error: "validation" };
    const row = await getById("ColumnMappings", id);
    if (!row) return { ok: false, error: "notFound" };
    await update("ColumnMappings", id, { target_field: target }, me.email);
    await logActivity(me.email, "update", "ColumnMapping", id, { column: row.source_column, target });
    revalidatePath("/settings/mappings");
    return { ok: true, data: null };
  } catch (e) {
    return toError(e);
  }
}

export async function deleteMapping(id: string): Promise<ActionResult<null>> {
  try {
    const me = await authorize("settings:manage");
    const row = await getById("ColumnMappings", id);
    if (!row) return { ok: false, error: "notFound" };
    await softDelete("ColumnMappings", id, me.email);
    await logActivity(me.email, "delete", "ColumnMapping", id, { column: row.source_column });
    revalidatePath("/settings/mappings");
    return { ok: true, data: null };
  } catch (e) {
    return toError(e);
  }
}

/** Forget every saved column for one platform, so the next import starts from the built-in Meta names. */
export async function resetPlatformMappings(platformId: string): Promise<ActionResult<{ removed: number }>> {
  try {
    const me = await authorize("settings:manage");
    const rows = (await getAll("ColumnMappings")).filter((m) => m.platform_id === platformId);
    for (const r of rows) await softDelete("ColumnMappings", r.id, me.email);
    await logActivity(me.email, "delete", "ColumnMapping", platformId, { removed: rows.length });
    revalidatePath("/settings/mappings");
    return { ok: true, data: { removed: rows.length } };
  } catch (e) {
    return toError(e);
  }
}

/* ---------- Own password ---------- */

export async function changeOwnPassword(input: unknown): Promise<ActionResult<null>> {
  try {
    const me = await getCurrentUser();
    if (!me) return { ok: false, error: "forbidden" };
    const d = ChangePasswordInput.parse(input);
    const row = (await getAll("Users")).find((u) => u.email.toLowerCase() === me.email);
    if (!row) return { ok: false, error: "envAdminPassword" };
    if (!(await verifyPassword(d.current, row.password_hash))) return { ok: false, error: "validation", fieldErrors: { current: "wrongPassword" } };
    await update("Users", row.id, { password_hash: await hashPassword(d.next) }, me.email);
    await logActivity(me.email, "update", "User", row.id, { passwordChanged: true });
    return { ok: true, data: null };
  } catch (e) {
    return toError(e);
  }
}
