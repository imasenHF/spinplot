import assert from "node:assert/strict";
import { createCurveMatrix } from "./curve-matrix.js";

const axis = { name: "Magnetic field", unit: "G" };
const curves = [
  { index: 7, B: [1, 2, 3], y: [70, 71, 72], xAxis: axis },
  { index: 2, B: [1, 2, 3], y: [20, 21, 22], xAxis: axis },
  { index: 5, B: [1, 2, 3], y: [50, 51, 52], xAxis: axis },
];
const variable = {
  name: "Temperature",
  unit: "K",
  mode: "array",
  valuesByCurve: { 7: 50, 2: 10, 5: 30 },
};
const matrix = createCurveMatrix(curves, [7, 2, 5], variable);

assert.deepEqual(matrix.x, { name: "Magnetic field", unit: "G", values: [1, 2, 3] });
assert.deepEqual(matrix.y, { name: "Temperature", unit: "K", values: [10, 30, 50] });
assert.deepEqual(matrix.metadata.curveIndices, [2, 5, 7]);
assert.deepEqual(matrix.real, [
  [20, 21, 22],
  [50, 51, 52],
  [70, 71, 72],
]);
assert.deepEqual(curves[0].y, [70, 71, 72], "source curve data must remain unchanged");

const unitless = createCurveMatrix(curves, [2, 5, 7], {
  name: "Scan index",
  unit: "",
  mode: "linear",
  valuesByCurve: { 2: 0, 5: 1, 7: 2 },
});
assert.equal(unitless.y.name, "Scan index");
assert.equal(unitless.y.unit, "", "empty units stay empty rather than creating empty parentheses");

assert.throws(
  () => createCurveMatrix(curves, [2, 5, 7], {
    name: "Temperature",
    unit: "K",
    valuesByCurve: { 2: 10, 5: 10, 7: 30 },
  }),
  /values must be unique/i,
);
assert.throws(
  () => createCurveMatrix(curves, [2, 5, 7], {
    name: "Temperature",
    unit: "K",
    valuesByCurve: { 2: 10, 5: 30 },
  }),
  /must have a scan-variable value/i,
);
assert.throws(
  () => createCurveMatrix([
    curves[0],
    { ...curves[1], xAxis: { name: "Magnetic field", unit: "mT" } },
  ], [7, 2], { name: "Temperature", unit: "K", valuesByCurve: { 7: 0, 2: 1 } }),
  /incompatible X-axis quantities or units/i,
);

console.log("Manual-curve matrix construction, scan-axis labels, ordering, and validation passed.");
