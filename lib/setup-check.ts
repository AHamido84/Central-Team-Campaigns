import "server-only";
import { envAdmin } from "@/lib/auth/users";
import { dataBackendKind, getBackend, googleEnv } from "@/lib/sheets/client";
import { TABLE_NAMES } from "@/lib/sheets/tables";

export type CheckState = "ok" | "fail" | "warn";
export interface Check { key: string; state: CheckState; detail?: string }

/** Turns a Google API error into a short reason the person can act on. */
function reason(e: unknown): string {
  const err = e as { code?: number; status?: number; message?: string; response?: { status?: number } };
  const status = err.code ?? err.status ?? err.response?.status;
  const msg = String(err.message ?? e);
  if (/DECODER|PEM|private key|asn1|routines/i.test(msg)) return "badKey";
  if (/invalid_grant|account not found|invalid_client/i.test(msg)) return "badAccount";
  if (/has not been used|is disabled|SERVICE_DISABLED|accessNotConfigured/i.test(msg)) return "apiDisabled";
  if (status === 403 || /permission/i.test(msg)) return "notShared";
  if (status === 404 || /not found/i.test(msg)) return "notFound";
  return "other";
}

/**
 * Checks the server settings without revealing any secret: only whether each
 * one is present and whether the sheet can be opened.
 */
export async function runSetupCheck(): Promise<{ checks: Check[]; serviceEmail: string; ok: boolean }> {
  const checks: Check[] = [];
  const add = (key: string, state: CheckState, detail?: string) => checks.push({ key, state, detail });
  add("authSecret", process.env.AUTH_SECRET ? "ok" : "fail");
  add("adminAccount", envAdmin() ? "ok" : "warn");
  const google = dataBackendKind() === "google";
  add("dataBackend", google ? "ok" : "fail");
  const g = googleEnv();
  add("serviceEmail", /@.+\.iam\.gserviceaccount\.com$/.test(g.email) ? "ok" : "fail");
  add("privateKey", /-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----/.test(g.key) ? "ok" : "fail");
  add("spreadsheetId", /^[a-zA-Z0-9_-]{30,}$/.test(g.id) ? "ok" : "fail");
  if (google && checks.every((c) => c.state !== "fail")) {
    try {
      const tabs = await (await getBackend()).listTabs();
      add("sheetAccess", "ok");
      const missing = TABLE_NAMES.filter((t) => !tabs.includes(t));
      add("tabs", missing.length ? "fail" : "ok", missing.join(", "));
    } catch (e) {
      console.error("[setup-check]", (e as Error).message);
      add("sheetAccess", "fail", reason(e));
    }
  } else {
    add("sheetAccess", "fail", "skipped");
  }
  add("appUrl", process.env.APP_URL?.startsWith("https://") ? "ok" : "warn");
  return { checks, serviceEmail: g.email, ok: checks.every((c) => c.state !== "fail") };
}
