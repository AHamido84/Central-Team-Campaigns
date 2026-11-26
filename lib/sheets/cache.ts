/** Small per-process read cache. Cleared for a tab on every write to it. */
const TTL_MS = Number(process.env.SHEETS_CACHE_TTL_MS ?? 60_000);

type Entry = { at: number; value: unknown };
const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T;
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;
  const p = load()
    .then((value) => {
      store.set(key, { at: Date.now(), value });
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export function invalidate(key?: string) {
  if (key === undefined) store.clear();
  else store.delete(key);
}
