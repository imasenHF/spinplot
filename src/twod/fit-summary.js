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
        fields.push(name === 'Amplitude' ? 'S(P) = A√P/(1 + P/Psat) + C' : 'ΔB(P) = A√(1 + P/Psat) + C');
        continue;
      }
      const entry = key === 'P' ? ['Psat', fit.parameters.P, ' mW']
        : key === 'half' && name === 'Amplitude' ? ['P½', fit.parameters.PHalf, ' mW']
        : key === 'A' ? ['A', fit.parameters.A, '']
        : key === 'C' ? ['C', fit.parameters.C, '']
        : key === 'r2' ? ['R²', fit.r2, '']
        : key === 'rmse' ? ['RMSE', fit.rmse, '']
        : key === 'n' ? ['No. of points', fit.n, ''] : null;
      if (entry) fields.push(entry[0] + ' = ' + format(entry[1]) + entry[2]);
    }
    if (fields.length) lines.push(name, ...fields);
  }
  return lines;
}
