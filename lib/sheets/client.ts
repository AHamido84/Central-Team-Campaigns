import type { SheetBackend } from "./backend";
import { MemorySheetBackend } from "./memory-backend";

const g = globalThis as unknown as { __adsHubBackend?: SheetBackend | null };

export class SheetsConfigError extends Error {}

export function dataBackendKind(): "google" | "memory" {
  return process.env.DATA_BACKEND === "google" ? "google" : "memory";
}

/** Returns the configured backend. Server only (never import from a client component). */
export async function getBackend(): Promise<SheetBackend> {
  if (g.__adsHubBackend) return g.__adsHubBackend;
  if (dataBackendKind() === "google") {
    const { GOOGLE_SERVICE_ACCOUNT_EMAIL: email, GOOGLE_PRIVATE_KEY: key, SPREADSHEET_ID: id } = process.env;
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
