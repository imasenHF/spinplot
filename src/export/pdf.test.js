import assert from "node:assert/strict";
import test from "node:test";
import { pdfFromCanvas } from "./pdf.js";

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
async function makePdf({ width = 600, height = 400, design = { width: 200, height: 120 } } = {}) {
  const canvas = {
    width,
    height,
    toBlob(callback, type, quality) {
      assert.equal(type, "image/jpeg");
      assert.equal(quality, 0.98);
      callback(new Blob([jpeg], { type: "image/jpeg" }));
    },
  };
  return new Uint8Array(
    await (await pdfFromCanvas({ canvas, design, dpi: 300 })).arrayBuffer(),
  );
}

test("PDF is a valid raster-image page with the requested physical dimensions", async () => {
  const bytes = await makePdf();
  const text = new TextDecoder().decode(bytes);
  assert.ok(text.startsWith("%PDF-1.4"));
  assert.match(text, /\/Subtype \/Image \/Width 600 \/Height 400/);
  assert.match(text, /\/Filter \/DCTDecode/);
  assert.match(text, /\/MediaBox \[0 0 150\.000 90\.000\]/);
  assert.match(text, /\/Im0 Do/);
  assert.ok(text.endsWith("%%EOF\n"));
});

test("PDF cross-reference offsets point to the actual object byte positions", async () => {
  const bytes = await makePdf();
  const text = new TextDecoder().decode(bytes);
  const startMarker = text.lastIndexOf("startxref");
  const startXref = Number(text.slice(startMarker + 9).trim().split("\n")[0]);
  assert.ok(Number.isInteger(startXref));
  const xrefText = new TextDecoder().decode(bytes.slice(startXref));
  const lines = xrefText.split("\n");
  assert.equal(lines[0], "xref");
  assert.equal(lines[1], "0 6");
  for (let id = 1; id <= 5; id++) {
    const offset = Number(lines[id + 2].slice(0, 10));
    assert.equal(new TextDecoder().decode(bytes.slice(offset, offset + 7)), String(id) + " 0 obj");
  }
  assert.equal(new TextDecoder().decode(bytes.slice(startXref, startXref + 5)), "xref\n");
});

test("PDF rejects missing or invalid canvas image data", async () => {
  await assert.rejects(
    pdfFromCanvas({ canvas: { width: 0, height: 0 }, design: { width: 100, height: 80 } }),
    /requires a rendered canvas/,
  );
  await assert.rejects(
    pdfFromCanvas({
      canvas: {
        width: 100,
        height: 80,
        toBlob(callback) {
          callback(new Blob(["not jpeg"], { type: "image/jpeg" }));
        },
      },
      design: { width: 100, height: 80 },
    }),
    /valid JPEG image/,
  );
});
