// Shared Z-domain mapping for heatmap, contour and 3D surface views.
// A logarithmic Z axis only represents strictly positive signal samples.
export function zFraction(z, min, max, scale = 'linear') {
  if (!Number.isFinite(z) || !(max > min)) return NaN;
  if (scale === 'log') {
    if (!(z > 0) || !(min > 0)) return NaN;
    return (Math.log(z) - Math.log(min)) / (Math.log(max) - Math.log(min));
  }
  return (z - min) / (max - min);
}

export function zAtFraction(fraction, min, max, scale = 'linear') {
  return scale === 'log'
    ? Math.exp(Math.log(min) + fraction * (Math.log(max) - Math.log(min)))
    : min + fraction * (max - min);
}

export function zRange(rows, xi, yi, settings = {}) {
  const logarithmic = settings.zScale === 'log';
  let min = Infinity, max = -Infinity, positiveMin = Infinity, positiveMax = -Infinity;
  for (const j of yi) for (const i of xi) {
    const z = rows[j]?.[i];
    if (!Number.isFinite(z)) continue;
    min = Math.min(min, z);
    max = Math.max(max, z);
    if (z > 0) { positiveMin = Math.min(positiveMin, z); positiveMax = Math.max(positiveMax, z); }
  }
  if (logarithmic && !Number.isFinite(positiveMin))
    throw Error('Logarithmic Z requires positive signal values. Zero and negative values cannot be plotted.');
  if (!Number.isFinite(min)) { min = 0; max = 1; }
  if (logarithmic) { min = positiveMin; max = positiveMax; }
  if (min === max) {
    if (logarithmic) { min /= 10; max *= 10; }
    else { min -= 0.5; max += 0.5; }
  }
  const lo = settings.zMin === '' || settings.zMin == null ? min : Number(settings.zMin);
  const hi = settings.zMax === '' || settings.zMax == null ? max : Number(settings.zMax);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || !(hi > lo) || (logarithmic && !(lo > 0)))
    throw Error(logarithmic ? 'Logarithmic Z bounds must be positive with Z min < Z max.' : 'Z min must be less than Z max');
  return { min: lo, max: hi, scale: logarithmic ? 'log' : 'linear', dataMin: min, dataMax: max };
}

export function zTicks(min, max, scale = 'linear', count = 5) {
  return Array.from({ length: count }, (_, k) => zAtFraction(k / (count - 1), min, max, scale));
}

export function zoomZ(min, max, delta, scale = 'linear') {
  const log = scale === 'log';
  const a = log ? Math.log(min) : min, b = log ? Math.log(max) : max;
  if (!(b > a)) return null;
  const factor = delta > 0 ? 1.15 : 1 / 1.15;
  const center = (a + b) / 2, half = (b - a) * factor / 2;
  const lo = center - half, hi = center + half;
  return log ? [Math.exp(lo), Math.exp(hi)] : [lo, hi];
}
