import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyProjectionSpaceFlags,
  fitMainRows,
  normalizeEmptyProjectionSpace,
  resolveMainInsets,
} from "./footprint.js";
import { fitMainColumns } from "../twod/ui.js";

test("empty projection-space presets describe optional top/right occupancy", () => {
  assert.deepEqual(emptyProjectionSpaceFlags("none"), { top: false, right: false });
  assert.deepEqual(emptyProjectionSpaceFlags("top"), { top: true, right: false });
  assert.deepEqual(emptyProjectionSpaceFlags("right"), { top: false, right: true });
  assert.deepEqual(emptyProjectionSpaceFlags("both"), { top: true, right: true });
  assert.equal(normalizeEmptyProjectionSpace("unknown"), "none");
  assert.equal(normalizeEmptyProjectionSpace(undefined), "none");
});

test("a subplot can occupy only the unused top or right space shared by its row/column", () => {
  const natural = { left: 52, right: 20, top: 42, bottom: 55 };
  const shared = { left: 52, right: 140, top: 130, bottom: 55 };
  assert.deepEqual(resolveMainInsets(natural, shared, "none"), shared);
  assert.deepEqual(resolveMainInsets(natural, shared, "top"), {
    ...shared,
    top: natural.top,
  });
  assert.deepEqual(resolveMainInsets(natural, shared, "right"), {
    ...shared,
    right: natural.right,
  });
  assert.deepEqual(resolveMainInsets(natural, shared, "both"), {
    ...shared,
    top: natural.top,
    right: natural.right,
  });
});

test("occupancy never covers a projection displayed by the same subplot", () => {
  const natural = {
    left: 52,
    right: 140,
    top: 130,
    bottom: 55,
    hasTopProjection: true,
    hasRightProjection: true,
  };
  const shared = { left: 52, right: 180, top: 170, bottom: 55 };
  assert.deepEqual(resolveMainInsets(natural, shared, "both"), shared);
  assert.deepEqual(
    resolveMainInsets({ ...natural, hasTopProjection: false }, shared, "both"),
    { ...shared, top: 130 },
  );
  assert.deepEqual(
    resolveMainInsets({ ...natural, hasRightProjection: false }, shared, "both"),
    { ...shared, right: 140 },
  );
});

test("occupying right projection space retains colorbar and axis reservations", () => {
  const natural = {
    left: 52,
    right: 100,
    top: 42,
    bottom: 55,
    hasRightProjection: false,
  };
  const shared = { left: 52, right: 220, top: 42, bottom: 55 };
  assert.equal(resolveMainInsets(natural, shared, "right").right, 100);
});

test("occupying projection space also works for 1D subplots without projections", () => {
  const natural = { left: 56, right: 16, top: 34, bottom: 40 };
  const shared = { left: 56, right: 140, top: 120, bottom: 40 };
  assert.deepEqual(resolveMainInsets(natural, shared, "both"), {
    left: 56,
    right: 16,
    top: 34,
    bottom: 40,
  });
});

test("row allocation keeps shared main heights equal while rows reflow", () => {
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

test("row allocation leaves spanning rows to the shared-inset layout", () => {
  assert.equal(
    fitMainRows([{ row: 1, rowSpan: 2, insets: { top: 50, bottom: 20 } }], 2, 600),
    null,
  );
});

test("row allocation rejects a canvas with insufficient main plot height", () => {
  assert.throws(
    () => fitMainRows([{ row: 1, insets: { top: 290, bottom: 290 } }], 1, 600),
    /Canvas too small/,
  );
});

test("column allocation retains aligned main widths by default", () => {
  const fitted = fitMainColumns(
    [
      { col: 1, box: { cellW: 400 }, insets: { left: 50, right: 80, rightFraction: 0, top: 20, bottom: 20 } },
      { col: 2, box: { cellW: 400 }, insets: { left: 50, right: 140, rightFraction: 0.14, top: 80, bottom: 20 } },
    ],
    2,
    1000,
  );
  assert.ok(Math.abs(fitted.widths.reduce((sum, width) => sum + width, 0) - 1000) < 1e-9);
  const mainWidths = fitted.widths.map(
    (width, index) => width - fitted.insets[index].left - fitted.insets[index].right,
  );
  assert.ok(Math.abs(mainWidths[0] - mainWidths[1]) < 1e-9);
  assert.ok(fitted.widths[1] > fitted.widths[0]);
});
