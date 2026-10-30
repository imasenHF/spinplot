import assert from "node:assert/strict";
import test from "node:test";
import { pdfFromScene } from "./pdf.js";

async function contentFor(scene) {
  const blob = pdfFromScene({ design: { width: 100, height: 80 }, scene });
  return new TextDecoder().decode(await blob.arrayBuffer());
}

test("PDF preserves three-digit light plot backgrounds instead of converting them to black", async () => {
  const pdf = await contentFor([
    { type: "path", d: "M 0 0 L 100 0 L 100 80 Z", fill: "#fff", dash: [] },
    { type: "text", text: "Axis", x: 5, y: 10, font: "12px Arial", fill: "#262626", m: [1, 0, 0, 1, 0, 0] },
  ]);
  assert.match(pdf, /1\.0000 1\.0000 1\.0000 rg/);
  assert.match(pdf, /0\.1490 0\.1490 0\.1490 rg/);
});

test("PDF parses short, long, alpha-suffixed hex and RGB percentage colors", async () => {
  const pdf = await contentFor([
    { type: "path", d: "M 0 0 L 1 0", stroke: "#abc", width: 1, dash: [] },
    { type: "path", d: "M 0 1 L 1 1", stroke: "#12345678", width: 1, dash: [] },
    { type: "path", d: "M 0 2 L 1 2", stroke: "rgb(100% 0% 50%)", width: 1, dash: [] },
  ]);
  assert.match(pdf, /0\.6667 0\.7333 0\.8000 RG/);
  assert.match(pdf, /0\.0706 0\.2039 0\.3373 RG/);
  assert.match(pdf, /1\.0000 0\.0000 0\.5000 RG/);
});

test("PDF reports unsupported colors rather than silently substituting black", async () => {
  await assert.rejects(
    contentFor([{ type: "path", d: "M 0 0 L 1 1", stroke: "var(--plot-color)", width: 1, dash: [] }]),
    /Unsupported PDF color/,
  );
});

test("PDF keeps dark plot styles dark", async () => {
  const pdf = await contentFor([
    { type: "path", d: "M 0 0 L 100 0 L 100 80 Z", fill: "#11181b", dash: [] },
    { type: "text", text: "Axis", x: 5, y: 10, font: "12px Arial", fill: "#dbe5e7", m: [1, 0, 0, 1, 0, 0] },
  ]);
  assert.match(pdf, /0\.0667 0\.0941 0\.1059 rg/);
  assert.match(pdf, /0\.8588 0\.8980 0\.9059 rg/);
});
