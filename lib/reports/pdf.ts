import "server-only";
import { existsSync } from "node:fs";

/**
 * Headless Chrome for PDFs.
 * - On Vercel: @sparticuz/chromium (a Chromium build that fits in a serverless function).
 * - Locally: CHROME_EXECUTABLE_PATH, or the first Chrome/Chromium found in the usual places.
 */
async function launch() {
  const puppeteer = (await import("puppeteer-core")).default;
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
  }
  const candidates = [
    process.env.CHROME_EXECUTABLE_PATH,
    "/opt/pw-browsers/chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean) as string[];
  const executablePath = candidates.find((p) => existsSync(p));
  if (!executablePath) throw new Error("chromeNotFound");
  return puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"] });
}

export async function renderPdf(url: string, footer: { left: string; right: string }, locale = "ar") {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 1 });
    await page.emulateMediaType("print");
    await page.setCookie({ name: "NEXT_LOCALE", value: locale, url });
    await page.goto(url, { waitUntil: "networkidle0", timeout: 45_000 });
    await page.waitForSelector("[data-report-ready]", { timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "16mm", left: "10mm", right: "10mm" },
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `<div style="width:100%;font-size:8px;color:#7b8496;padding:0 10mm;display:flex;justify-content:space-between;font-family:sans-serif"><span>${esc(footer.left)}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span><span>${esc(footer.right)}</span></div>`,
    });
  } finally {
    await browser.close();
  }
}
