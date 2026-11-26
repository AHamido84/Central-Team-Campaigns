import type { Cell, RowUpdate, TabData } from "./backend";
import { cached, invalidate } from "./cache";
import { getBackend } from "./client";
import { withLock } from "./mutex";
import { fromRow, toRow } from "./serialize";
import { TABLES, type RowOf, type TableName } from "./tables";

export const newId = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();

type Patch<T extends TableName> = Partial<RowOf<T>>;
export interface ListOptions {
  includeDeleted?: boolean;
}

const cacheKey = (tab: string) => `tab:${tab}`;

async function readTabCached(tab: string): Promise<TabData> {
  const backend = await getBackend();
  return cached(cacheKey(tab), () => backend.readTab(tab));
}

function parse<T extends TableName>(table: T, headers: string[], row: Cell[]): RowOf<T> {
  return TABLES[table].schema.parse(fromRow(headers, row)) as RowOf<T>;
}

/* ---------------- Write batching ----------------
 * Inserts and updates made within the same short window are merged into one
 * append per tab and one batchUpdate across tabs. This keeps the number of
 * Google API calls low (the Sheets quota is per minute).
 */
type PendingInsert = { kind: "insert"; tab: TableName; obj: Record<string, unknown>; resolve: () => void; reject: (e: unknown) => void };
type PendingUpdate = {
  kind: "update";
  tab: TableName;
  id: string;
  patch: Record<string, unknown>;
  resolve: (row: Record<string, unknown> | null) => void;
  reject: (e: unknown) => void;
};
type QueueState = { ops: (PendingInsert | PendingUpdate)[]; timer: ReturnType<typeof setTimeout> | null };
const gq = globalThis as unknown as { __adsHubQueue?: QueueState };
const Q = (gq.__adsHubQueue ??= { ops: [], timer: null });
const FLUSH_MS = 15;

function schedule() {
  if (!Q.timer) Q.timer = setTimeout(() => void flush(), FLUSH_MS);
}

async function flush() {
  Q.timer = null;
  const ops = Q.ops;
  Q.ops = [];
  if (!ops.length) return;
  const tabs = [...new Set(ops.map((o) => o.tab))];
  await withLock("__writes__", async () => {
    const backend = await getBackend();
    try {
      // Fresh read of every tab that receives updates (row numbers must be exact).
      const fresh = new Map<string, TabData>();
      for (const tab of tabs) {
        if (ops.some((o) => o.tab === tab && o.kind === "update")) fresh.set(tab, await backend.readTab(tab));
      }
      const headersOf = async (tab: TableName) => fresh.get(tab)?.headers ?? (await readTabCached(tab)).headers;

      // Appends: one call per tab.
      for (const tab of tabs) {
        const inserts = ops.filter((o): o is PendingInsert => o.tab === tab && o.kind === "insert");
        if (!inserts.length) continue;
        const headers = await headersOf(tab);
        await backend.appendRows(tab, inserts.map((i) => toRow(headers, i.obj)));
      }

      // Updates: one batchUpdate for everything.
      const updates: RowUpdate[] = [];
      const results = new Map<PendingUpdate, Record<string, unknown> | null>();
      for (const op of ops) {
        if (op.kind !== "update") continue;
        const data = fresh.get(op.tab)!;
        const idx = data.rows.findIndex((r) => String(r[0]) === op.id);
        if (idx === -1) {
          results.set(op, null);
          continue;
        }
        const merged = { ...fromRow(data.headers, data.rows[idx]), ...op.patch };
        const values = toRow(data.headers, merged, data.rows[idx]);
        data.rows[idx] = values; // later ops on the same row see this change
        updates.push({ tab: op.tab, rowNumber: idx + 2, values });
        results.set(op, merged);
      }
      if (updates.length) {
        // Merge multiple updates of the same row into the last one.
        const byRow = new Map<string, RowUpdate>();
        for (const u of updates) byRow.set(`${u.tab}:${u.rowNumber}`, u);
        await backend.updateRows([...byRow.values()]);
      }
      for (const tab of tabs) invalidate(cacheKey(tab));
      for (const op of ops) {
        if (op.kind === "insert") op.resolve();
        else op.resolve(results.get(op) ?? null);
      }
    } catch (e) {
      for (const tab of tabs) invalidate(cacheKey(tab));
      for (const op of ops) op.reject(e);
    }
  });
}

function enqueueInsert(tab: TableName, obj: Record<string, unknown>) {
  return new Promise<void>((resolve, reject) => {
    Q.ops.push({ kind: "insert", tab, obj, resolve, reject });
    schedule();
  });
}

function enqueueUpdate(tab: TableName, id: string, patch: Record<string, unknown>) {
  return new Promise<Record<string, unknown> | null>((resolve, reject) => {
    Q.ops.push({ kind: "update", tab, id, patch, resolve, reject });
    schedule();
  });
}

/* ---------------- Generic repository ---------------- */

export async function getAll<T extends TableName>(table: T, opts: ListOptions = {}): Promise<RowOf<T>[]> {
  const data = await readTabCached(table);
  const rows = data.rows.filter((r) => String(r[0] ?? "") !== "").map((r) => parse(table, data.headers, r));
  return opts.includeDeleted ? rows : rows.filter((r) => !(r as { is_deleted: boolean }).is_deleted);
}

export async function getById<T extends TableName>(table: T, id: string, opts: ListOptions = {}): Promise<RowOf<T> | null> {
  const rows = await getAll(table, { includeDeleted: true });
  const row = rows.find((r) => (r as { id: string }).id === id) ?? null;
  if (row && !opts.includeDeleted && (row as { is_deleted: boolean }).is_deleted) return null;
  return row;
}

function stamp(data: Record<string, unknown>, actor: string) {
  const ts = nowIso();
  return { ...data, id: (data.id as string) || newId(), created_at: ts, updated_at: ts, created_by: actor, is_deleted: false };
}

export async function insert<T extends TableName>(table: T, data: Patch<T>, actor: string): Promise<RowOf<T>> {
  const obj = stamp(data as Record<string, unknown>, actor);
  await enqueueInsert(table, obj);
  return TABLES[table].schema.parse(obj) as RowOf<T>;
}

export async function bulkInsert<T extends TableName>(table: T, rows: Patch<T>[], actor: string): Promise<RowOf<T>[]> {
  const objs = rows.map((r) => stamp(r as Record<string, unknown>, actor));
  await Promise.all(objs.map((o) => enqueueInsert(table, o)));
  return objs.map((o) => TABLES[table].schema.parse(o) as RowOf<T>);
}

export async function update<T extends TableName>(table: T, id: string, patch: Patch<T>, actor: string): Promise<RowOf<T> | null> {
  void actor;
  const clean = { ...(patch as Record<string, unknown>) };
  delete clean.id;
  delete clean.created_at;
  delete clean.created_by;
  const merged = await enqueueUpdate(table, id, { ...clean, updated_at: nowIso() });
  return merged ? (TABLES[table].schema.parse(merged) as RowOf<T>) : null;
}

export async function bulkUpdate<T extends TableName>(table: T, patches: { id: string; patch: Patch<T> }[]): Promise<number> {
  const ts = nowIso();
  const res = await Promise.all(patches.map((p) => enqueueUpdate(table, p.id, { ...(p.patch as Record<string, unknown>), updated_at: ts })));
  return res.filter(Boolean).length;
}

export async function softDelete<T extends TableName>(table: T, id: string, actor: string): Promise<boolean> {
  return (await update(table, id, { is_deleted: true } as Patch<T>, actor)) !== null;
}

export interface UpsertResult<T extends TableName> {
  inserted: RowOf<T>[];
  updated: { row: RowOf<T>; previous: Record<string, Cell> }[];
}

/**
 * Insert-or-update by a unique key column (e.g. DailyResults.row_key) in one
 * read + one append + one batchUpdate. Rows matching a soft deleted row are
 * revived. Duplicate keys inside `rows` collapse to the last one.
 */
export async function upsertMany<T extends TableName>(
  table: T,
  keyField: keyof RowOf<T> & string,
  rows: Patch<T>[],
  actor: string,
): Promise<UpsertResult<T>> {
  return withLock("__writes__", async () => {
    const backend = await getBackend();
    const data = await backend.readTab(table);
    const keyIdx = data.headers.indexOf(keyField);
    if (keyIdx === -1) throw new Error(`Column ${keyField} missing in ${table}. Run: npm run init-sheets`);
    const existing = new Map<string, number>();
    data.rows.forEach((r, i) => {
      const k = String(r[keyIdx] ?? "");
      if (k) existing.set(k, i);
    });

    const unique = new Map<string, Record<string, unknown>>();
    for (const r of rows) unique.set(String((r as Record<string, unknown>)[keyField]), r as Record<string, unknown>);

    const ts = nowIso();
    const appends: Cell[][] = [];
    const updates: RowUpdate[] = [];
    const result: UpsertResult<T> = { inserted: [], updated: [] };

    for (const [key, r] of unique) {
      const idx = existing.get(key);
      if (idx === undefined) {
        const obj = stamp(r, actor);
        appends.push(toRow(data.headers, obj));
        result.inserted.push(TABLES[table].schema.parse(obj) as RowOf<T>);
      } else {
        const previous = fromRow(data.headers, data.rows[idx]);
        const merged = { ...previous, ...r, id: previous.id, created_at: previous.created_at, created_by: previous.created_by, updated_at: ts, is_deleted: false };
        const values = toRow(data.headers, merged, data.rows[idx]);
        updates.push({ tab: table, rowNumber: idx + 2, values });
        result.updated.push({ row: TABLES[table].schema.parse(merged) as RowOf<T>, previous });
      }
    }
    try {
      if (appends.length) await backend.appendRows(table, appends);
      if (updates.length) await backend.updateRows(updates);
    } finally {
      invalidate(cacheKey(table));
    }
    return result;
  });
}

/** Writes raw previous values back (used by import rollback). */
export async function restoreRows<T extends TableName>(table: T, rows: Record<string, Cell>[]): Promise<number> {
  return withLock("__writes__", async () => {
    const backend = await getBackend();
    const data = await backend.readTab(table);
    const index = new Map<string, number>();
    data.rows.forEach((r, i) => index.set(String(r[0]), i));
    const updates: RowUpdate[] = [];
    for (const prev of rows) {
      const idx = index.get(String(prev.id));
      if (idx === undefined) continue;
      updates.push({ tab: table, rowNumber: idx + 2, values: toRow(data.headers, { ...prev, updated_at: nowIso() }, data.rows[idx]) });
    }
    try {
      if (updates.length) await backend.updateRows(updates);
    } finally {
      invalidate(cacheKey(table));
    }
    return updates.length;
  });
}

/** Test helper: wait for queued writes. */
export async function flushWrites() {
  if (Q.timer) {
    clearTimeout(Q.timer);
    await flush();
  }
  await withLock("__writes__", async () => undefined);
}
