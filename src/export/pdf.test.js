import assert from "node:assert/strict";
import test from "node:test";
import { pdfPageDimensions } from "./pdf-utils.js";

test("PDF page dimensions preserve the design canvas physical size", () => {
  assert.deepEqual(pdfPageDimensions({ width: 800, height: 500 }), {
    width: 600,
    height: 375,
  });
  assert.deepEqual(pdfPageDimensions({ width: 354, height: 500 }), {
    width: 265.5,
    height: 375,
  });
});

test("PDF page dimensions reject invalid design sizes", () => {
  for (const design of [null, {}, { width: 0, height: 100 }, { width: 100, height: -1 }, { width: NaN, height: 10 }]) {
    assert.throws(() => pdfPageDimensions(design), /positive design dimensions/);
  }
});
