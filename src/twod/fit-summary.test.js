import assert from 'node:assert/strict';
import test from 'node:test';
import { scanFitResultLines } from './fit-summary.js';

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
    'S(P) = I₀√P/(1 + P/P½)^(b/2)',
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
  assert.ok(lines.includes('S(P) = I₀√P/(1 + P/P½)^(b/2)'));
  assert.ok(lines.includes('ΔB(P) = A√(1 + P/Psat) + C'));
  assert.ok(lines.includes('I₀ = 3.25'));
  assert.ok(lines.includes('b = 1.4'));
  assert.ok(lines.includes('P½ = 12.5 mW'));
  assert.ok(lines.includes('Psat = 0.25 mW'));
  assert.ok(lines.includes('C = 1'));
  assert.equal(lines.filter(line => line === 'No. of points = 8').length, 2);
});
