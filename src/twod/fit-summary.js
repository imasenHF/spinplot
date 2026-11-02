// Assemble fit labels without recalculating any spectral parameters.
export function scanFitResultLines(data, selection = []) {
  if (!data?.valid || !Array.isArray(selection) || !selection.length) return [];
  const lines = [];
  const selected = new Set(selection);
  const format = value => Number.isFinite(value) ? Number(value.toPrecision(5)).toString() : '—';
  for (const [name, fit] of [['Amplitude', data.amplitudeFit], ['Linewidth', data.linewidthFit]]) {
    if (!fit?.valid) continue;
    const fields = [];
    if (name === 'Amplitude') {
      if (selected.has('formula')) fields.push('Spp(P) = I₀·sqrt(P)/(1 + P/P½)^(b/2)');
      if (selected.has('half')) fields.push('P½ = ' + format(fit.parameters.Phalf) + ' mW');
      for (const [leftKey, leftText, rightKey, rightText] of [
        ['I0', 'I₀ = ' + format(fit.parameters.I0), 'b', 'b = ' + format(fit.parameters.b)],
        ['r2', 'R² = ' + format(fit.r2), 'rmse', 'RMSE = ' + format(fit.rmse)],
      ]) {
        if (selected.has(leftKey) && selected.has(rightKey)) fields.push(leftText + '\t' + rightText);
        else if (selected.has(leftKey)) fields.push(leftText);
        else if (selected.has(rightKey)) fields.push(rightText);
      }
      if (selected.has('n')) fields.push('No. of points = ' + format(fit.n));
    } else {
      for (const key of selection) {
        if (key === 'formula') {
          fields.push('ΔB(P) = A·sqrt(1 + P/Psat) + C');
          continue;
        }
        const entry = key === 'P' ? ['Psat', fit.parameters.P, ' mW']
          : key === 'A' ? ['A', fit.parameters.A, '']
            : key === 'C' ? ['C', fit.parameters.C, '']
              : null;
        if (key === 'r2' && selection.includes('rmse')) {
          fields.push('R² = ' + format(fit.r2) + '    RMSE = ' + format(fit.rmse));
          continue;
        }
        if (key === 'rmse' && selection.includes('r2')) continue;
        if (key === 'r2') fields.push('R² = ' + format(fit.r2));
        else if (key === 'rmse') fields.push('RMSE = ' + format(fit.rmse));
        else if (key === 'n') fields.push('No. of points = ' + format(fit.n));
        else if (entry) fields.push(entry[0] + ' = ' + format(entry[1]) + entry[2]);
      }
    }
    if (fields.length) lines.push(name, ...fields);
  }
  return lines;
}


// Extract residuals from the fitted observations; excluded and invalid points are absent.
export function scanFitResidualSeries(data, {
  amplitude = true,
  linewidth = true,
  displayX = value => value,
  amplitudeUnit = '',
  linewidthUnit = '',
  mode = 'absolute',
} = {}) {
  if (!data?.valid) return [];
  const series = [];
  for (const [key, label, fit, enabled, curveIndex, unit] of [
    ['amplitude', 'Amplitude residual', data.amplitudeFit, amplitude, -103, amplitudeUnit],
    ['linewidth', 'Linewidth residual', data.linewidthFit, linewidth, -104, linewidthUnit],
  ]) {
    if (!enabled || !fit?.valid || !Array.isArray(fit.points)) continue;
    const relative = mode === 'relative';
    const candidates = fit.points.map(point => ({ ...point, x: displayX(point.power) }))
      .filter(point => Number.isFinite(point.x) && Number.isFinite(point.residual));
    // Scale the zero guard to this fit's signal units rather than imposing an absolute cutoff.
    const fittedScale = candidates.reduce((max, point) => Number.isFinite(point.fitted)
      ? Math.max(max, Math.abs(point.fitted)) : max, 0);
    const threshold = fittedScale * 1e-12;
    const points = candidates.filter(point => !relative ||
      Number.isFinite(point.fitted) && Math.abs(point.fitted) > threshold)
      .map(point => ({
        x: point.x,
        y: relative ? 100 * (point.residual / Math.abs(point.fitted)) : point.residual,
        index: point.index,
      })).filter(point => Number.isFinite(point.y));
    if (!points.length && (!relative || !candidates.length)) continue;
    const largest = points.reduce((max, point) => Math.max(max, Math.abs(point.y)), 0);
    const relativeRmse = !points.length ? null : largest === 0 ? 0 : largest * Math.sqrt(
      points.reduce((sum, point) => sum + (point.y / largest) ** 2, 0) / points.length);
    series.push({ key, label: relative ? label.replace(' residual', ' relative residual') : label,
      unit: relative ? '%' : unit, curveIndex,
      rmse: relative ? relativeRmse : fit.rmse, points,
      omittedCount: relative ? candidates.length - points.length : 0 });
  }
  return series;
}
