// SpinPlot 1D display layer
// Raw signal arrays are never modified here. This module only creates display data.

export function createDisplayCurves(curves, options = {}) {
  const mode = options.mode || 'overlay';
  const scale = Number.isFinite(options.scale) ? options.scale : 1;
  const offsets = options.offsets || [];
  const spacing = Number.isFinite(options.spacing) ? options.spacing : 1;

  return curves.map((curve, index) => {
    const offset = mode === 'stack'
      ? (Number.isFinite(offsets[index]) ? offsets[index] : index * spacing)
      : 0;

    return {
      ...curve,
      yDisplay: curve.y.map(v => v * scale + offset),
      offset
    };
  });
}

export function displayRange(curves) {
  const values = curves.flatMap(c => c.yDisplay || c.y || []);
  if (!values.length) return { min: 0, max: 1 };
  return { min: Math.min(...values), max: Math.max(...values) };
}
