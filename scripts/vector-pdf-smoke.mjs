import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const port = 4173;
const origin = `http://127.0.0.1:${port}`;
const server = spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  stdio: "inherit",
  env: process.env,
});
let browser;
const temp = await mkdtemp(join(tmpdir(), "spinplot-vector-pdf-"));
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(origin);
      if (response.ok) { ready = true; break; }
    } catch {}
    await delay(500);
  }
  assert.ok(ready, "Vite preview server did not become ready");

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ acceptDownloads: true, viewport: { width: 1440, height: 1000 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(origin, { waitUntil: "networkidle" });

  await page.locator("#dataFiles").setInputFiles({
    name: "vector-export.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("B,Intensity\n3300,0\n3310,0.2\n3320,1.4\n3330,0.5\n3340,-0.8\n3350,-0.1\n3360,0\n"),
  });
  await page.waitForFunction(() => {
    const info = document.querySelector("#fileInfo")?.textContent || "";
    return info && !info.includes("No data loaded");
  });
  await page.evaluate(() => {
    const setValue = (id, value) => {
      const element = document.getElementById(id);
      element.value = value;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    };
    setValue("figureTitle", "Vector PDF export regression");
    setValue("yLabel", "强度 α");
    setValue("imageFormat", "pdf");
    const hideY = document.getElementById("hideYTitle");
    hideY.checked = false;
    hideY.dispatchEvent(new Event("change", { bubbles: true }));
  });

  const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
  await page.evaluate(() => document.getElementById("exportImageBtnSide").click());
  let download;
  try {
    download = await downloadPromise;
  } catch (error) {
    const status = await page.locator("#statusMain").textContent().catch(() => "unavailable");
    const log = await page.locator("#log").textContent().catch(() => "unavailable");
    throw new Error(`PDF download did not start; status=${status}; log=${log}; ${error.message}`);
  }
  const pdfPath = join(temp, "vector-export.pdf");
  await download.saveAs(pdfPath);
  const bytes = await readFile(pdfPath);
  const raw = bytes.toString("latin1");

  assert.ok(raw.startsWith("%PDF-"), "Export did not produce a PDF document");
  assert.ok(!/\/Subtype\s*\/Image/.test(raw), "PDF contains a raster image XObject");
  assert.match(raw, /\/Type\s*\/Font\b/, "PDF does not contain a PDF font resource");
  assert.match(raw, /\bBT\b/, "PDF does not contain text objects");
  assert.match(raw, /\bET\b/, "PDF text object is not closed");

  const extracted = execFileSync("pdftotext", [pdfPath, "-"], { encoding: "utf8" });
  assert.match(extracted, /Vector PDF export regression/, "PDF text extraction missed the figure title");
  assert.match(extracted, /Magnetic Field/, "PDF text extraction missed the X-axis title");
  assert.match(extracted, /强度 α/, "PDF text extraction missed Chinese and Greek characters in the Y-axis title");

  assert.deepEqual(pageErrors, [], "Browser raised errors during vector PDF export");
  console.log(`Vector PDF smoke passed: ${bytes.length} bytes; extracted ${extracted.trim().split(/\s+/).length} words.`);
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  await rm(temp, { recursive: true, force: true });
}
