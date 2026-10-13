import { correctBaseline, estimateNoise } from "./signal.js";
import { mean, median, finiteNum, parseRegions } from "../core/numeric.js";
import { alignedCurve } from "./axis.js";
import { createDisplayCurves } from "../plotting/oned.js";

// rawCurves are read-only; y is processed amplitude, yd is display-only amplitude.
export function processSubplot(rawCurves, sp, target, controls, manualScales) {
  const ids = sp.curves.filter((i) => i >= 0 && i < rawCurves.length);
  const baseline = {
    mode: controls.baselineMode,
    regions:
      controls.baselineMode === "region"
        ? parseRegions(controls.baselineRegions)
        : null,
    reference: finiteNum(controls.baselineBref),
  };
  let curves = ids.map((i) => {
    const c = alignedCurve(rawCurves[i], i, target);
    return { ...c, y: correctBaseline(c.B, c.y, baseline) };
  });
  if (controls.scaleMode === "manual")
    curves = curves.map((c) => {
      const f = finiteNum(manualScales[c.index]);
      if (!Number.isFinite(f))
        throw Error(`Curve ${c.index}: invalid manual scale`);
      return { ...c, ampScale: f, y: c.y.map((v) => v * f) };
    });
  else if (controls.scaleMode === "noise" && curves.length) {
    const regions = parseRegions(sp.noiseRegions || ""),
      sig = curves.map((c) => estimateNoise(c.B, c.y, regions));
    if (sig.some((v) => !Number.isFinite(v) || v <= 0))
      throw Error("Invalid noise estimate");
    const reference =
      controls.noiseReference === "median" ? median(sig) : sig[0];
    curves = curves.map((c, i) => ({
      ...c,
      noise: sig[i],
      ampScale: reference / sig[i],
      y: c.y.map((v) => (v * reference) / sig[i]),
    }));
  }
  return createDisplayCurves(curves, sp);
}
