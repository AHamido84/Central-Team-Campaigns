import "./env";
import { initSheets } from "../lib/sheets/init";

initSheets()
  .then(() => console.log("Done. All tabs and headers are ready."))
  .catch((e) => {
    console.error("init-sheets failed:", e?.message ?? e);
    process.exit(1);
  });
