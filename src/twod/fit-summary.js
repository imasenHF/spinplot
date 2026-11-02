// Assemble fit labels without recalculating any spectral parameters.
export function scanFitResultLines(data, selection = []) {
  if (!data?.valid || !Array.isArray(selection) || !selection.length) return [];
  const lines = [];
  const format = value => Number.isFinite(value) ? Number(value.toPrecision(5)).toString() : '—';
  for (const [name, fit] of [['Amplitude', data.amplitudeFit], ['Linewidth', data.linewidthFit]]) {
    if (!fit?.valid) continue;
    const fields = [];
    for (const key of selection) {
      if (key === 'formula') {
        fields.push(name === 'Amplitude'
          ? 'Spp(P) = I₀·sqrt(P)/(1 + P/P½)^(b/2)'
          : 'ΔB(P) = A·sqrt(1 + P/Psat) + C');
        continue;
      }
      const entry = name === 'Amplitude'
        ? key === 'I0' ? ['I₀', fit.parameters.I0, '']
          : key === 'b' ? ['b', fit.parameters.b, '']
          : key === 'half' ? ['P½', fit.parameters.Phalf, ' mW']
          : null
        : key === 'P' ? ['Psat', fit.parameters.P, ' mW']
          : key === 'A' ? ['A', fit.parameters.A, '']
          : key === 'C' ? ['C', fit.parameters.C, '']
          : null;
      if (key === 'r2') fields.push('R² = ' + format(fit.r2));
      else if (key === 'rmse') fields.push('RMSE = ' + format(fit.rmse));
      else if (key === 'n') fields.push('No. of points = ' + format(fit.n));
      else if (entry) fields.push(entry[0] + ' = ' + format(entry[1]) + entry[2]);
    }
    if (fields.length) lines.push(name, ...fields);
  }
  return lines;
}


// Extract signed relative residuals from fitted observations; excluded and invalid points are absent.
// Normalize by |fitted| so the percentage keeps its sign for positive physical features.
export function scanFitResidualSeries(data, {
  amplitude = true,
  linewidth = true,
  displayX = value => value,
  } = {}) {
  if (!data?.valid) return [];
  const series = [];
  for (const [key, label, fit, enabled, curveIndex] of [
    ['amplitude', 'Amplitude relative residual', data.amplitudeFit, amplitude, -103],
    ['linewidth', 'Linewidth relative residual', data.linewidthFit, linewidth, -104],
  ]) {
    if (!enabled || !fit?.valid || !Array.isArray(fit.points)) continue;
    const points = fit.points.map(point => {
      const fitted = Number(point.fitted);
      const observed = Number(point.signal);
      const relativeResidual = Number.isFinite(observed) && Number.isFinite(fitted) && Math.abs(fitted) > 0
        ? 100 * (observed - fitted) / Math.abs(fitted)
        : NaN;
      return { x: displayX(point.power), y: relativeResidual, index: point.index };
    }).filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
    if (!points.length) continue;
    const rmse = Math.sqrt(points.reduce((sum, point) => sum + point.y * point.y, 0) / points.length);
    series.push({ key, label, unit: '%', curveIndex, rmse, points });
  }
  return series;
}
