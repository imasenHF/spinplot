import assert from "node:assert/strict";
import test from "node:test";
import { pdfFromSvg } from "./pdf.js";

test("vector PDF export validates SVG input and page dimensions", async () => {
  await assert.rejects(pdfFromSvg({ svg: "", design: { width: 200, height: 100 } }), /requires SVG markup/);
  await assert.rejects(pdfFromSvg({ svg: "<svg></svg>", design: { width: 0, height: 100 } }), /requires SVG markup/);
});

test("vector PDF export reports malformed SVG", async () => {
  const original = globalThis.DOMParser;
  globalThis.DOMParser = class {
    parseFromString() { return { querySelector: () => ({}), documentElement: { localName: "parsererror" } }; }
  };
  try {
    await assert.rejects(pdfFromSvg({ svg: "<svg", design: { width: 200, height: 100 } }), /Could not parse the vector SVG/);
  } finally {
    if (original === undefined) delete globalThis.DOMParser;
    else globalThis.DOMParser = original;
  }
});
