import type { SheetBackend } from "./backend";
import { MemorySheetBackend } from "./memory-backend";

const g = globalThis as unknown as { __adsHubBackend?: SheetBackend | null };

export class SheetsConfigError extends Error {}

export function dataBackendKind(): "google" | "memory" {
  return process.env.DATA_BACKEND === "google" ? "google" : "memory";
}

/**
 * Reads the Google settings and forgives common paste mistakes in Vercel:
 * quotes around the key, real line breaks or literal \n, spaces, and a full
 * sheet URL instead of just the ID.
 */
export function googleEnv() {
  let email = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "").trim().replace(/^"|"$/g, "");
  let rawKey = (process.env.GOOGLE_PRIVATE_KEY ?? "").trim();
  // Someone may paste the whole downloaded JSON file into GOOGLE_PRIVATE_KEY.
  if (rawKey.startsWith("{")) {
    try {
      const j = JSON.parse(rawKey) as { private_key?: string; client_email?: string };
      rawKey = j.private_key ?? rawKey;
      email ||= j.client_email ?? "";
    } catch {
      /* not JSON after all */
    }
  }
  const key = rawKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n").replace(/\r/g, "");
  const rawId = (process.env.SPREADSHEET_ID ?? "").trim();
  const id = rawId.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] ?? rawId;
  return { email, key, id };
}

/** Returns the configured backend. Server only (never import from a client component). */
export async function getBackend(): Promise<SheetBackend> {
  if (g.__adsHubBackend) return g.__adsHubBackend;
  if (dataBackendKind() === "google") {
    const { email, key, id } = googleEnv();
    if (!email || !key || !id) {
      throw new SheetsConfigError(
        "DATA_BACKEND=google needs GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY and SPREADSHEET_ID in .env.local",
      );
    }
    const { GoogleSheetBackend } = await import("./google-backend");
    g.__adsHubBackend = new GoogleSheetBackend(id, email, key);
  } else {
    g.__adsHubBackend = new MemorySheetBackend(process.env.MEMORY_DB_FILE || undefined);
  }
  return g.__adsHubBackend;
}

/** For tests and scripts. */
export function setBackend(b: SheetBackend | null) {
  g.__adsHubBackend = b;
}
