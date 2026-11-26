import { z } from "zod";
import { ForbiddenError } from "@/lib/auth/permissions";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Turns any thrown error into a result the form can show. */
export function toError(e: unknown): ActionResult<never> {
  if (e instanceof z.ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of e.issues) {
      const k = issue.path.join(".");
      if (!fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { ok: false, error: "validation", fieldErrors };
  }
  if (e instanceof ForbiddenError) return { ok: false, error: "forbidden" };
  console.error(e);
  return { ok: false, error: e instanceof Error ? e.message : "unknown" };
}
