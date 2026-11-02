import assert from 'node:assert/strict';
import test from 'node:test';
import { scanFitResultLines, scanFitResidualSeries } from './fit-summary.js';

const amplitudeFit = {
  valid: true, parameters: { I0: 3.25, b: 1.4, Phalf: 12.5 },
  r2: 0.99456, rmse: 0.12, n: 8,
};
const linewidthFit = {
  valid: true, parameters: { A: 3, P: 0.25, C: 1 },
  r2: 0.992, rmse: 0.2, n: 8,
};
test('scan fit results are hidden by default', () => {
  assert.deepEqual(scanFitResultLines({ valid: true, amplitudeFit }), []);
});
test('Bruker amplitude summary reports I0, exponent and P-half model parameter', () => {
  const lines = scanFitResultLines({ valid: true, amplitudeFit }, ['formula', 'I0', 'b', 'half']);
  assert.deepEqual(lines, [
    'Amplitude',
    'Spp(P) = I₀√P/(1 + P/P½)^(b/2)',
    'I₀ = 3.25',
    'b = 1.4',
    'P½ = 12.5 mW',
  ]);
});
test('invalid fits have no plotted result', () => {
  assert.deepEqual(scanFitResultLines({ valid: true, amplitudeFit: { valid: false } }, ['I0']), []);
});
test('amplitude and linewidth summaries use their own parameter sets', () => {
  const lines = scanFitResultLines({ valid: true, amplitudeFit, linewidthFit },
    ['formula', 'I0', 'b', 'half', 'P', 'A', 'C', 'r2', 'rmse', 'n']);
  assert.ok(lines.includes('Spp(P) = I₀√P/(1 + P/P½)^(b/2)'));
  assert.ok(lines.includes('ΔB(P) = A√(1 + P/Psat) + C'));
  assert.ok(lines.includes('I₀ = 3.25'));
  assert.ok(lines.includes('b = 1.4'));
  assert.ok(lines.includes('P½ = 12.5 mW'));
  assert.ok(lines.includes('Psat = 0.25 mW'));
  assert.ok(lines.includes('C = 1'));
  assert.equal(lines.filter(line => line === 'No. of points = 8').length, 2);
});


test('fit residuals use fitted observations and the displayed power coordinate', () => {
  const data = { valid: true, amplitudeFit: { ...amplitudeFit, points: [
    { index: 1, power: 4, residual: 0.2 },
    { index: 3, power: 9, residual: -0.1 },
    { index: 4, power: 16, residual: NaN },
  ] } };
  const [series] = scanFitResidualSeries(data, {
    amplitude: true, linewidth: false, displayX: Math.sqrt,
  });
  assert.equal(series.label, 'Amplitude residual');
  assert.equal(series.curveIndex, -103);
  assert.deepEqual(series.points, [
    { x: 2, y: 0.2, index: 1 },
    { x: 3, y: -0.1, index: 3 },
  ]);
});
test('amplitude and linewidth residuals remain separate and retain their units', () => {
  const data = {
    valid: true,
    amplitudeFit: { ...amplitudeFit, points: [{ index: 0, power: 4, residual: 0.1 }] },
    linewidthFit: { ...linewidthFit, points: [{ index: 0, power: 4, residual: -0.02 }] },
  };
  const series = scanFitResidualSeries(data, { amplitudeUnit: '', linewidthUnit: 'G' });
  assert.deepEqual(series.map(item => [item.key, item.curveIndex, item.unit]), [
    ['amplitude', -103, ''], ['linewidth', -104, 'G'],
  ]);
  assert.deepEqual(series.map(item => item.points[0].y), [0.1, -0.02]);
});
test('disabled or invalid fits do not contribute residual points', () => {
  const data = { valid: true, amplitudeFit: { valid: false }, linewidthFit: {
    valid: true, rmse: 0.1, points: [{ index: 0, power: NaN, residual: 0.2 }],
  } };
  assert.deepEqual(scanFitResidualSeries(data), []);
  assert.deepEqual(scanFitResidualSeries({ ...data, valid: false }), []);
});
