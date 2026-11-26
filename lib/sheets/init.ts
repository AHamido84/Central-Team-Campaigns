import { getBackend } from "./client";
import { TABLES, TABLE_NAMES } from "./tables";

/** Creates missing tabs and header columns. Safe to run many times. */
export async function initSheets(log: (msg: string) => void = console.log) {
  const backend = await getBackend();
  log(`Backend: ${backend.kind}`);
  for (const name of TABLE_NAMES) {
    const { created, addedColumns } = await backend.ensureTab(name, TABLES[name].columns);
    if (created) log(`  + created tab ${name} (${TABLES[name].columns.length} columns)`);
    else if (addedColumns.length) log(`  ~ ${name}: added columns ${addedColumns.join(", ")}`);
    else log(`  = ${name} is up to date`);
  }
}
