import "server-only";
import { insert } from "@/lib/sheets";

/** Appends one row to the ActivityLog tab. Never blocks the main action on failure. */
export async function logActivity(user: string, action: string, entity: string, entityId: string, details?: unknown) {
  try {
    await insert(
      "ActivityLog",
      {
        user,
        action,
        entity,
        entity_id: entityId,
        timestamp: new Date().toISOString(),
        details: details === undefined ? "" : typeof details === "string" ? details : JSON.stringify(details),
      },
      user,
    );
  } catch (e) {
    console.error("ActivityLog write failed", e);
  }
}
