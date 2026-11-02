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
      if (selected.has('I0')) fields.push('I₀ = ' + format(fit.parameters.I0));
      if (selected.has('half')) fields.push('P½ = ' + format(fit.parameters.Phalf) + ' mW');
      const showB = selected.has('b');
      const showRmse = selected.has('rmse');
      if (showB && showRmse) {
        fields.push('b = ' + format(fit.parameters.b) + '\tRMSE = ' + format(fit.rmse));
      } else {
        if (showB) fields.push('b = ' + format(fit.parameters.b));
        if (selected.has('r2')) fields.push('R² = ' + format(fit.r2));
        if (showRmse) fields.push('RMSE = ' + format(fit.rmse));
      }
      if (showB && showRmse && selected.has('r2')) fields.push('R² = ' + format(fit.r2));
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
} = {}) {
  if (!data?.valid) return [];
  const series = [];
  for (const [key, label, fit, enabled, curveIndex, unit] of [
    ['amplitude', 'Amplitude residual', data.amplitudeFit, amplitude, -103, amplitudeUnit],
    ['linewidth', 'Linewidth residual', data.linewidthFit, linewidth, -104, linewidthUnit],
  ]) {
    if (!enabled || !fit?.valid || !Array.isArray(fit.points)) continue;
    const points = fit.points.map(point => ({
      x: displayX(point.power),
      y: point.residual,
      index: point.index,
    })).filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
    if (points.length) series.push({ key, label, unit, curveIndex, rmse: fit.rmse, points });
  }
  return series;
}
