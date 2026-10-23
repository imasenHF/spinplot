import test from "node:test";
import assert from "node:assert/strict";
import { createCurveMatrix } from "./curve-matrix.js";

function curve(index, B, y, xAxis = { name: "Magnetic Field", unit: "G" }) {
  return { index, name: "Trace " + index, B, y, xAxis };
}

test("manual curve matrix interpolates only inside the shared X range", () => {
  const matrix = createCurveMatrix([
    curve(0, [0, 1, 2, 3], [0, 10, 20, 30]),
    curve(1, [0.5, 1.5, 2.5, 3], [1, 11, 21, 31]),
  ], [0, 1], { name: "Temperature", unit: "K", valuesByCurve: { 0: 10, 1: 30 } });
  assert.deepEqual(matrix.x.values, [1, 2, 3]);
  assert.deepEqual(matrix.y.values, [10, 30]);
  assert.deepEqual(matrix.real[0], [10, 20, 30]);
  assert.deepEqual(matrix.real[1], [6, 16, 31]);
  assert.deepEqual(matrix.metadata.curveIndices, [0, 1]);
});

test("scan values remain attached to curve IDs and rows are sorted by variable value", () => {
  const matrix = createCurveMatrix([
    curve(0, [0, 1, 2], [1, 1, 1]),
    curve(1, [0, 1, 2], [2, 2, 2]),
    curve(2, [0, 1, 2], [3, 3, 3]),
  ], [2, 0, 1], { name: "Temperature", unit: "K", valuesByCurve: { 0: 50, 1: 10, 2: 30 } });
  assert.deepEqual(matrix.y.values, [10, 30, 50]);
  assert.deepEqual(matrix.metadata.curveIndices, [1, 2, 0]);
  assert.deepEqual(matrix.real.map((row) => row[0]), [2, 3, 1]);
});

test("manual curve matrix rejects incompatible units, non-overlapping ranges and duplicate scan values", () => {
  assert.throws(() => createCurveMatrix([
    curve(0, [0, 1, 2], [1, 2, 3]),
    curve(1, [0, 1, 2], [2, 3, 4], { name: "Magnetic Field", unit: "mT" }),
  ], [0, 1], { valuesByCurve: { 0: 0, 1: 1 } }), /incompatible X-axis/);
  assert.throws(() => createCurveMatrix([
    curve(0, [0, 1, 2], [1, 2, 3]), curve(1, [3, 4, 5], [2, 3, 4]),
  ], [0, 1], { valuesByCurve: { 0: 0, 1: 1 } }), /no common X-axis/);
  assert.throws(() => createCurveMatrix([
    curve(0, [0, 1, 2], [1, 2, 3]), curve(1, [0, 1, 2], [2, 3, 4]),
  ], [0, 1], { valuesByCurve: { 0: 1, 1: 1 } }), /must be unique/);
});


test("unitless scan axes keep an empty unit and source curves remain unchanged", () => {
  const source = [
    curve(4, [1, 2, 3], [4, 5, 6]),
    curve(8, [1, 2, 3], [8, 9, 10]),
  ];
  const matrix = createCurveMatrix(source, [4, 8], {
    name: "Scan index",
    unit: "",
    mode: "array",
    valuesByCurve: { 4: 0, 8: 1 },
  });
  assert.equal(matrix.y.name, "Scan index");
  assert.equal(matrix.y.unit, "");
  assert.deepEqual(source[0].B, [1, 2, 3]);
  assert.deepEqual(source[0].y, [4, 5, 6]);
});

test("manual curve matrix rejects missing or non-finite scan values", () => {
  assert.throws(() => createCurveMatrix([
    curve(0, [0, 1, 2], [1, 2, 3]),
    curve(1, [0, 1, 2], [2, 3, 4]),
  ], [0, 1], { valuesByCurve: { 0: 0 } }), /scan-variable value/);
  assert.throws(() => createCurveMatrix([
    curve(0, [0, 1, 2], [1, 2, 3]),
    curve(1, [0, 1, 2], [2, 3, 4]),
  ], [0, 1], { valuesByCurve: { 0: 0, 1: "NaN" } }), /finite numbers/);
});
