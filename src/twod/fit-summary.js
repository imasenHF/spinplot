// Prepare selected scan-fit parameters for display; no fitting is performed here.
export function scanFitResultLines(data, selection = []) {
  if (!data?.valid || !Array.isArray(selection) || !selection.length) return [];
  const lines = [];
  const format = value => Number.isFinite(value) ? Number(value.toPrecision(5)).toString() : '—';
  for (const [name, fit] of [['Amplitude', data.amplitudeFit], ['Linewidth', data.linewidthFit]]) {
    if (!fit?.valid) continue;
    const fields = [];
    for (const key of selection) {
      if (key === 'formula') { fields.push(name === 'Amplitude' ? 'S(P) = A√P/(1 + P/P½) + C' : 'ΔB(P) = A√(1 + P/Psat) + C'); continue; }
      const entry = key === 'P' ? [name === 'Amplitude' ? 'P½' : 'Psat', fit.parameters.P, ' mW']
        : key === 'A' ? ['A', fit.parameters.A, '']
        : key === 'C' ? ['C', fit.parameters.C, '']
        : key === 'r2' ? ['R2', fit.r2, '']
        : key === 'rmse' ? ['RMSE', fit.rmse, '']
        : key === 'n' ? ['n', fit.n, ''] : null;
      if (entry) fields.push(entry[0] + ' = ' + format(entry[1]) + entry[2]);
    }
    if (fields.length) lines.push(name, ...fields);
  }
  return lines;
}
