import { create2DData } from "./twod.js";
import { axisKind } from "../processing/axis.js";
import { interp1 } from "../processing/interpolation.js";

function monotonicDirection(values, label) {
  if (!Array.isArray(values) || values.length < 2) throw new Error(label + " requires at least two coordinate points.");
  let direction = 0;
  for (let i = 0; i < values.length; i++) {
    if (!Number.isFinite(values[i])) throw new Error(label + " contains a non-finite coordinate.");
    if (i === 0) continue;
    const delta = values[i] - values[i - 1];
    if (delta === 0 || (direction && Math.sign(delta) !== direction)) throw new Error(label + " coordinates must be strictly monotonic.");
    direction = Math.sign(delta);
  }
}

function axisCompatible(reference, candidate) {
  const a = reference || { name: "Field", unit: "G" }, b = candidate || { name: "Field", unit: "G" };
  const aUnit = String(a.unit || "").trim().toLowerCase(), bUnit = String(b.unit || "").trim().toLowerCase();
  if (axisKind(a) !== axisKind(b) || aUnit !== bUnit) return false;
  if (!aUnit && String(a.name || "").trim().toLowerCase() !== String(b.name || "").trim().toLowerCase()) return false;
  return true;
}

// Source records stay read-only. Scan-variable values are keyed by curve index so
// reordering a subplot does not assign a value to a different curve.
export function createCurveMatrix(curves, curveIndices, scanVariable) {
  if (!Array.isArray(curveIndices) || curveIndices.length < 2) throw new Error("Heatmap and Variable scan require at least two 1D curves.");
  const byIndex = new Map((curves || []).map((curve) => [Number(curve.index), curve]));
  const valuesByCurve = scanVariable?.valuesByCurve || {};
  const entries = curveIndices.map((id) => {
    const curve = byIndex.get(Number(id));
    if (!curve || !Array.isArray(curve.B) || !Array.isArray(curve.y)) throw new Error("Curve " + id + " is unavailable for 2D conversion.");
    if (curve.B.length !== curve.y.length) throw new Error("Curve " + id + " has mismatched coordinate and signal lengths.");
    monotonicDirection(curve.B, "Curve " + id);
    const rawValue = valuesByCurve[id];
    if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") throw new Error("Every selected curve must have a scan-variable value.");
    const value = Number(rawValue);
    if (!Number.isFinite(value)) throw new Error("Scan-variable values must be finite numbers.");
    return { id: Number(id), curve, value };
  });
  const sortedValues = entries.map((entry) => entry.value).sort((a, b) => a - b);
  if (sortedValues.some((value, i) => i > 0 && value === sortedValues[i - 1])) throw new Error("Scan-variable values must be unique.");

  const referenceAxis = entries[0].curve.xAxis || { name: "Field", unit: "G" };
  for (const entry of entries.slice(1)) {
    const axis = entry.curve.xAxis || { name: "Field", unit: "G" };
    if (!axisCompatible(referenceAxis, axis)) throw new Error("Selected curves have incompatible X-axis quantities or units.");
  }

  const lower = Math.max(...entries.map(({ curve }) => Math.min(curve.B[0], curve.B.at(-1))));
  const upper = Math.min(...entries.map(({ curve }) => Math.max(curve.B[0], curve.B.at(-1))));
  if (!(upper > lower)) throw new Error("Selected curves have no common X-axis interval.");
  const eps = Math.max(1e-12, Math.abs(upper - lower) * 1e-12);
  const x = entries[0].curve.B.filter((value) => value >= lower - eps && value <= upper + eps);
  if (x.length < 2) throw new Error("The common X-axis interval contains fewer than two reference samples.");

  const rows = entries.slice().sort((a, b) => a.value - b.value);
  const real = rows.map(({ curve }) => interp1(curve.B, curve.y, x));
  const imag = rows.map(() => x.map(() => 0));
  return create2DData({
    name: "Manual 1D curves",
    x: { name: referenceAxis.name || "Field", unit: referenceAxis.unit || "", values: x },
    y: { name: String(scanVariable?.name || "").trim() || "Curve index", unit: String(scanVariable?.unit || "").trim(), values: rows.map((entry) => entry.value) },
    real, imag,
    metadata: { manualCurveSource: true, curveIndices: rows.map((entry) => entry.id) },
  }, true);
}
