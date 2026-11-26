const g = globalThis as unknown as { __adsHubLocks?: Map<string, Promise<unknown>> };
const chains = (g.__adsHubLocks ??= new Map<string, Promise<unknown>>());

/** Serializes read-modify-write work per tab inside this server process. */
export function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = chains.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  chains.set(key, next.catch(() => undefined));
  return next;
}
