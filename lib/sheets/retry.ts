const RETRYABLE = new Set([429, 500, 502, 503, 504]);

function statusOf(err: unknown): number | undefined {
  const e = err as { code?: number | string; status?: number; response?: { status?: number } };
  const s = e?.response?.status ?? e?.status ?? (typeof e?.code === "number" ? e.code : Number(e?.code));
  return Number.isFinite(s) ? Number(s) : undefined;
}

export interface RetryOptions {
  retries?: number;
  baseMs?: number;
  maxMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

/** Retries Google API calls on HTTP 429 / 5xx with exponential backoff + jitter. */
export async function withBackoff<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { retries = 5, baseMs = 500, maxMs = 16_000, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = opts;
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      const status = statusOf(err);
      if (attempt >= retries || status === undefined || !RETRYABLE.has(status)) throw err;
      const delay = Math.min(maxMs, baseMs * 2 ** attempt) * (0.5 + Math.random() / 2);
      attempt++;
      await sleep(delay);
    }
  }
}
