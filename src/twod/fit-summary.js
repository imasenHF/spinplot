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
          ? 'Spp(P) = I₀√P/(1 + P/P½)^(b/2)'
          : 'ΔB(P) = A√(1 + P/Psat) + C');
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
