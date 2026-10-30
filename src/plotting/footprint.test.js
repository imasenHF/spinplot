import test from "node:test";
import assert from "node:assert/strict";
import {
  applyPlotFootprint,
  fitMainRows,
  footprintProjectionFlags,
  normalizePlotFootprint,
} from "./footprint.js";

const settings = {
  showProjections: true,
  showXProjection: true,
  showYProjection: true,
  showColorbar: true,
};

test("plot footprint presets select top and right projection regions", () => {
  assert.deepEqual(footprintProjectionFlags("main"), { top: false, right: false });
  assert.deepEqual(footprintProjectionFlags("top"), { top: true, right: false });
  assert.deepEqual(footprintProjectionFlags("right"), { top: false, right: true });
  assert.deepEqual(footprintProjectionFlags("full"), { top: true, right: true });
  assert.equal(normalizePlotFootprint("unknown"), "full");
  assert.equal(normalizePlotFootprint(undefined), "full");
});

test("plot footprint preserves individual projection toggles and colorbar settings", () => {
  const cases = [
    ["main", false, false],
    ["top", true, false],
    ["right", false, true],
    ["full", true, true],
  ];
  for (const [footprint, top, right] of cases) {
    const resolved = applyPlotFootprint(settings, footprint);
    assert.equal(resolved.showXProjection, top);
    assert.equal(resolved.showYProjection, right);
    assert.equal(resolved.showColorbar, true);
  }
  assert.equal(
    applyPlotFootprint({ ...settings, showXProjection: false }, "full").showXProjection,
    false,
  );
  assert.equal(
    applyPlotFootprint({ ...settings, showProjections: false }, "full").showProjections,
    false,
  );
});

test("row footprint allocation keeps main plot heights equal while rows reflow", () => {
  const fitted = fitMainRows(
    [
      { row: 1, rowSpan: 1, insets: { top: 90, bottom: 40 } },
      { row: 1, rowSpan: 1, insets: { top: 50, bottom: 35 } },
      { row: 2, rowSpan: 1, insets: { top: 20, bottom: 50 } },
    ],
    2,
    600,
  );
  assert.equal(fitted.mainHeight, 200);
  assert.deepEqual(fitted.insets, [
    { top: 90, bottom: 40 },
    { top: 20, bottom: 50 },
  ]);
  assert.deepEqual(fitted.heights, [330, 270]);
  assert.equal(fitted.heights.reduce((sum, value) => sum + value, 0), 600);
  assert.equal(
    fitted.heights[0] - fitted.insets[0].top - fitted.insets[0].bottom,
    fitted.heights[1] - fitted.insets[1].top - fitted.insets[1].bottom,
  );
});

test("row footprint allocation leaves spanning rows to the shared-inset layout", () => {
  assert.equal(
    fitMainRows([{ row: 1, rowSpan: 2, insets: { top: 50, bottom: 20 } }], 2, 600),
    null,
  );
});

test("row footprint allocation rejects a canvas with insufficient main plot height", () => {
  assert.throws(
    () => fitMainRows([{ row: 1, insets: { top: 290, bottom: 290 } }], 1, 600),
    /Canvas too small/,
  );
});
