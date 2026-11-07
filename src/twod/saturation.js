// Shared CW EPR peak-to-peak analysis and bounded saturation fitting.
// All functions are pure and keep the acquired matrices unchanged.
export function peakFeatures(axis, signal, interval = null) {
  if (!Array.isArray(axis) || !Array.isArray(signal) || axis.length !== signal.length)
    return { valid: false, reason: 'Axis and signal arrays must have equal lengths.' };
  const lo = interval ? Math.min(...interval) : -Infinity;
  const hi = interval ? Math.max(...interval) : Infinity;
  if (interval && (!Number.isFinite(lo) || !Number.isFinite(hi) || lo >= hi))
    return { valid: false, reason: 'Invalid feature extraction interval.' };
  let min = Infinity, max = -Infinity, xMin = NaN, xMax = NaN, count = 0;
  for (let i = 0; i < axis.length; i++) {
    const x = axis[i], y = signal[i];
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < lo || x > hi) continue;
    count++;
    if (y < min) { min = y; xMin = x; }
    if (y > max) { max = y; xMax = x; }
  }
  if (count < 2) return { valid: false, reason: 'At least two finite points are required.' };
  if (max === min) return { valid: false, reason: 'A constant signal has undefined extrema separation.' };
  return { valid: true, amplitude: max - min, linewidth: Math.abs(xMax - xMin), xMax, xMin, maximum: max, minimum: min, count };
}
export function traceFeatures(matrix, component = 'real', interval = null) {
  const axis = matrix?.x?.values;
  const rows = component === 'imag' ? matrix?.imag : component === 'magnitude'
    ? matrix?.real?.map((row, j) => row.map((v, i) => Math.hypot(v, matrix.imag?.[j]?.[i] || 0)))
    : matrix?.real;
  if (!Array.isArray(rows) || !Array.isArray(axis) || !Array.isArray(matrix?.y?.values))
    return { valid: false, reason: 'Invalid two-dimensional matrix.' };
  return { valid: true, points: rows.map((row, i) => ({ index: i, scan: matrix.y.values[i], ...peakFeatures(axis, row, interval) })) };
}
export function attenuationToPower(dB, p0) {
  if (!Number.isFinite(dB) || !Number.isFinite(p0) || p0 <= 0) return NaN;
  const power = p0 * 10 ** (-dB / 10);
  return Number.isFinite(power) && power > 0 ? power : NaN;
}
export const saturationModels = {
  // Bruker Xenon P-half model. b is an independently adjustable exponent.
  amplitude: (power, i0, pHalf, b) => i0 * Math.sqrt(power) / (1 + power / pHalf) ** (b / 2),
  linewidth: (power, a, pSat, c) => a * Math.sqrt(1 + power / pSat) + c,
};
function linearFit(x, y, offset) {
  let sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < x.length; i++) {
    const u = x[i], v = y[i];
    sw++; sx += u; sy += v; sxx += u * u; sxy += u * v;
  }
  const det = sw * sxx - sx * sx;
  if (!(Math.abs(det) > 1e-14 * Math.max(sw * sxx, 1))) return null;
  if (!offset) return sxx > 0 ? { a: sxy / sxx, c: 0 } : null;
  const a = (sw * sxy - sx * sy) / det, c = (sy - a * sx) / sw;
  return { a, c };
}
function score(points, predict) {
  const residuals = points.map(point => point.signal - predict(point.power));
  const sse = residuals.reduce((sum, value) => sum + value * value, 0);
  return { sse, residuals, predict };
}
function refineAmplitudeShape(start, evaluate, xBounds, bBounds) {
  const clamp = (value, bounds) => Math.max(bounds[0], Math.min(bounds[1], value));
  const make = (x, b) => {
    const logPower = clamp(x, xBounds), exponent = clamp(b, bBounds);
    const candidate = evaluate(Math.exp(logPower), exponent);
    return { x: logPower, b: exponent, candidate, value: candidate?.sse ?? Infinity };
  };
  const xStep = Math.max((xBounds[1] - xBounds[0]) / 100, 1e-7);
  const bStep = Math.max((bBounds[1] - bBounds[0]) / 100, 1e-7);
  const xOffset = start[0] + xStep <= xBounds[1] ? xStep : -xStep;
  const bOffset = start[1] + bStep <= bBounds[1] ? bStep : -bStep;
  let simplex = [
    make(start[0], start[1]),
    make(start[0] + xOffset, start[1]),
    make(start[0], start[1] + bOffset),
  ];
  for (let iteration = 0; iteration < 800; iteration++) {
    simplex.sort((a, b) => a.value - b.value);
    const [best, second, worst] = simplex;
    const diameter = Math.max(
      Math.hypot(best.x - second.x, best.b - second.b),
      Math.hypot(best.x - worst.x, best.b - worst.b),
    );
    const spread = Math.abs(worst.value - best.value);
    if (diameter < 1e-11 || spread < 1e-24) break;

    const cx = (best.x + second.x) / 2;
    const cb = (best.b + second.b) / 2;
    const reflected = make(cx + (cx - worst.x), cb + (cb - worst.b));
    if (reflected.value < best.value) {
      const expanded = make(cx + 2 * (reflected.x - cx), cb + 2 * (reflected.b - cb));
      simplex[2] = expanded.value < reflected.value ? expanded : reflected;
    } else if (reflected.value < second.value) {
      simplex[2] = reflected;
    } else {
      const outside = reflected.value < worst.value;
      const contracted = outside
        ? make(cx + 0.5 * (reflected.x - cx), cb + 0.5 * (reflected.b - cb))
        : make(cx + 0.5 * (worst.x - cx), cb + 0.5 * (worst.b - cb));
      if (contracted.value < (outside ? reflected.value : worst.value)) {
        simplex[2] = contracted;
      } else {
        simplex = [
          best,
          make(best.x + 0.5 * (second.x - best.x), best.b + 0.5 * (second.b - best.b)),
          make(best.x + 0.5 * (worst.x - best.x), best.b + 0.5 * (worst.b - best.b)),
        ];
      }
    }
  }
  simplex.sort((a, b) => a.value - b.value);
  return simplex[0].candidate;
}
function fitBrukerAmplitude(points, {
  fitI0 = true, fitB = true, fitPhalf = true,
  fixedI0 = 1, fixedB = 2, fixedPhalf = 1,
  minPower = null, maxPower = null,
} = {}) {
  const fixed = { I0: Number(fixedI0), b: Number(fixedB), Phalf: Number(fixedPhalf) };
  if (!fitI0 && !(Number.isFinite(fixed.I0) && fixed.I0 > 0))
    return { valid: false, reason: 'Fixed I₀ must be a positive finite value.' };
  if (!fitB && !(Number.isFinite(fixed.b) && fixed.b > 0))
    return { valid: false, reason: 'Fixed b must be a positive finite value.' };
  if (!fitPhalf && !(Number.isFinite(fixed.Phalf) && fixed.Phalf > 0))
    return { valid: false, reason: 'Fixed P½ must be a positive finite value.' };

  const freeCount = Number(fitI0) + Number(fitB) + Number(fitPhalf);
  const required = Math.max(2, freeCount + 1);
  if (points.length < required)
    return { valid: false, reason: `At least ${required} valid points are required for the selected free parameters.` };
  if (new Set(points.map(point => point.power)).size < required)
    return { valid: false, reason: 'Too few distinct positive powers for the selected free parameters.' };

  const measuredMin = points[0].power, measuredMax = points.at(-1).power;
  if ((fitB || fitPhalf) && measuredMax / measuredMin < 3)
    return { valid: false, reason: 'Power range is too narrow for a stable saturation fit.' };
  const lower = minPower == null ? measuredMin : Number(minPower);
  const upper = maxPower == null ? measuredMax : Number(maxPower);
  if (fitPhalf && !(Number.isFinite(lower) && Number.isFinite(upper) && lower > 0 && upper > lower))
    return { valid: false, reason: 'Invalid P½ search range.' };

  const bMin = 0.1, bMax = 8;
  let pLeft = fitPhalf ? Math.log(lower) : Math.log(fixed.Phalf);
  let pRight = fitPhalf ? Math.log(upper) : Math.log(fixed.Phalf);
  let bLeft = fitB ? bMin : fixed.b;
  let bRight = fitB ? bMax : fixed.b;
  let best = null;

  const evaluate = (pHalf, b) => {
    const basis = points.map(point => Math.sqrt(point.power) / (1 + point.power / pHalf) ** (b / 2));
    let i0 = fixed.I0;
    if (fitI0) {
      let numerator = 0, denominator = 0;
      for (let i = 0; i < basis.length; i++) {
        numerator += basis[i] * points[i].signal;
        denominator += basis[i] * basis[i];
      }
      if (!(denominator > 0)) return null;
      i0 = numerator / denominator;
    }
    if (!(Number.isFinite(i0) && i0 > 0)) return null;
    const predict = power => saturationModels.amplitude(power, i0, pHalf, b);
    return { I0: i0, b, Phalf: pHalf, ...score(points, predict) };
  };

  for (let pass = 0; pass < 5; pass++) {
    const pCount = fitPhalf ? 120 : 1;
    const bCount = fitB ? 80 : 1;
    const pStep = pCount > 1 ? (pRight - pLeft) / (pCount - 1) : 0;
    const bStep = bCount > 1 ? (bRight - bLeft) / (bCount - 1) : 0;
    let passBest = null;
    for (let bi = 0; bi < bCount; bi++) {
      const b = fitB ? bLeft + bi * bStep : fixed.b;
      for (let pi = 0; pi < pCount; pi++) {
        const pHalf = fitPhalf ? Math.exp(pLeft + pi * pStep) : fixed.Phalf;
        const candidate = evaluate(pHalf, b);
        if (candidate && (!passBest || candidate.sse < passBest.sse)) passBest = candidate;
      }
    }
    if (!passBest) break;
    if (!best || passBest.sse < best.sse) best = passBest;
    if (!fitPhalf && !fitB) break;
    if (fitPhalf) {
      const center = Math.log(best.Phalf);
      const width = Math.max(pStep * 2, (Math.log(upper) - Math.log(lower)) * 1e-6);
      pLeft = Math.max(Math.log(lower), center - width);
      pRight = Math.min(Math.log(upper), center + width);
    }
    if (fitB) {
      const width = Math.max(bStep * 2, (bMax - bMin) * 1e-6);
      bLeft = Math.max(bMin, best.b - width);
      bRight = Math.min(bMax, best.b + width);
    }
  }
  if (best && fitPhalf && fitB) {
    const refined = refineAmplitudeShape(
      [Math.log(best.Phalf), best.b],
      evaluate,
      [Math.log(lower), Math.log(upper)],
      [bMin, bMax],
    );
    if (refined && refined.sse < best.sse) best = refined;
  }
  if (!best) return { valid: false, reason: 'Unable to identify saturation-model parameters.' };

  const average = points.reduce((sum, point) => sum + point.signal, 0) / points.length;
  const tss = points.reduce((sum, point) => sum + (point.signal - average) ** 2, 0);
  const rmse = Math.sqrt(best.sse / points.length);
  const r2 = tss > 0 ? 1 - best.sse / tss : null;
  const epsilon = 1e-5;
  const atPhalfBoundary = fitPhalf && (best.Phalf <= lower * (1 + epsilon) || best.Phalf >= upper * (1 - epsilon));
  const atExponentBoundary = fitB && (best.b <= bMin + epsilon || best.b >= bMax - epsilon);
  const warning = [
    atPhalfBoundary ? 'P½ is at the search boundary.' : null,
    atExponentBoundary ? 'b is at the search boundary (0.1–8).' : null,
  ].filter(Boolean).join(' ') || null;
  return {
    valid: true, model: 'amplitude',
    parameters: { I0: best.I0, b: best.b, Phalf: best.Phalf },
    parameterFit: { I0: fitI0, b: fitB, Phalf: fitPhalf },
    points: points.map((point, index) => ({
      ...point, fitted: best.predict(point.power), residual: best.residuals[index],
    })),
    sse: best.sse, rmse, r2, n: points.length, warning,
    atBoundary: Boolean(atPhalfBoundary || atExponentBoundary),
    modelName: 'P-half amplitude saturation',
  };
}
function solveLinewidthAt(points, pSat, allowOffset) {
  const basis = points.map(point => Math.sqrt(1 + point.power / pSat));
  const values = points.map(point => point.signal);
  const fitted = linearFit(basis, values, allowOffset);
  if (!fitted || !Number.isFinite(fitted.a) || !Number.isFinite(fitted.c)) return null;
  const predict = power => saturationModels.linewidth(power, fitted.a, pSat, fitted.c);
  return { ...fitted, P: pSat, ...score(points, predict) };
}
function fitLinewidth(points, { allowOffset = false, minPower = null, maxPower = null } = {}) {
  const required = allowOffset ? 5 : 4;
  if (points.length < required) return { valid: false, reason: `At least ${required} valid points are required.` };
  if (new Set(points.map(point => point.power)).size < required)
    return { valid: false, reason: 'Too few distinct positive powers.' };
  const pmin = points[0].power, pmax = points.at(-1).power;
  if (pmax / pmin < 3) return { valid: false, reason: 'Power range is too narrow for a stable linewidth fit.' };
  const lower = minPower == null ? pmin : Number(minPower);
  const upper = maxPower == null ? pmax : Number(maxPower);
  if (!(lower > 0 && upper > lower && Number.isFinite(upper)))
    return { valid: false, reason: 'Invalid characteristic-power search range.' };

  let best = null, left = Math.log(lower), right = Math.log(upper);
  for (let pass = 0; pass < 4; pass++) {
    let bestIndex = -1;
    const n = 120, step = (right - left) / (n - 1);
    for (let i = 0; i < n; i++) {
      const candidate = solveLinewidthAt(points, Math.exp(left + i * step), allowOffset);
      if (candidate && (!best || candidate.sse < best.sse)) { best = candidate; bestIndex = i; }
    }
    if (bestIndex < 0) break;
    const center = Math.log(best.P);
    left = Math.max(Math.log(lower), center - 2 * step);
    right = Math.min(Math.log(upper), center + 2 * step);
  }
  if (!best) return { valid: false, reason: 'Unable to identify linewidth-model parameters.' };
  const average = points.reduce((sum, point) => sum + point.signal, 0) / points.length;
  const tss = points.reduce((sum, point) => sum + (point.signal - average) ** 2, 0);
  const rmse = Math.sqrt(best.sse / points.length);
  const r2 = tss > 0 ? 1 - best.sse / tss : null;
  const atBoundary = best.P <= lower * (1 + 1e-5) || best.P >= upper * (1 - 1e-5);
  const warning = atBoundary ? 'Characteristic power is at the search boundary.' :
    best.P < pmin || best.P > pmax ? 'Characteristic power lies outside the measured power range.' : null;
  return {
    valid: true, model: 'linewidth',
    parameters: { A: best.a, P: best.P, C: best.c },
    points: points.map((point, index) => ({ ...point, fitted: best.predict(point.power), residual: best.residuals[index] })),
    sse: best.sse, rmse, r2, n: points.length, warning, atBoundary,
    modelName: 'Peak-to-peak power broadening',
  };
}
export function fitSaturation(rawPoints, options = {}) {
  const { model = 'amplitude', excludedIndices = [] } = options;
  if (!['amplitude', 'linewidth'].includes(model)) return { valid: false, reason: 'Unknown saturation model.' };
  if (!Array.isArray(rawPoints)) return { valid: false, reason: 'Missing scan points.' };
  const omitted = new Set(excludedIndices);
  const points = rawPoints.map((point, index) => ({ ...point, index: point.index ?? index }))
    .filter(point => !omitted.has(point.index) && Number.isFinite(point.power) && point.power > 0 && Number.isFinite(point.signal))
    .sort((a, b) => a.power - b.power);
  return model === 'amplitude' ? fitBrukerAmplitude(points, options) : fitLinewidth(points, options);
}
