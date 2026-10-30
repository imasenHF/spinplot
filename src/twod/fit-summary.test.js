import assert from 'node:assert/strict';
import test from 'node:test';
import { scanFitResultLines } from './fit-summary.js';

const fit = { valid: true, parameters: { A: 3, P: 0.25, C: 1 }, r2: 0.99456, rmse: 0.12, n: 8 };
test('scan fit results are hidden by default', () => {
  assert.deepEqual(scanFitResultLines({ valid: true, amplitudeFit: fit }), []);
});
test('only selected parameters are displayed with model names', () => {
  assert.deepEqual(scanFitResultLines({ valid: true, amplitudeFit: fit, linewidthFit: null }, ['P','r2']), [
    'Amplitude','P½ = 0.25 mW','R2 = 0.99456'
  ]);
});
test('invalid fits have no plotted result', () => {
  assert.deepEqual(scanFitResultLines({ valid: true, amplitudeFit: { valid: false } }, ['P']), []);
});
test('both fitted models remain distinguished', () => {
  const result=scanFitResultLines({valid:true,amplitudeFit:fit,linewidthFit:fit},['n']);
  assert.deepEqual(result,['Amplitude','n = 8','Linewidth','n = 8']);
});

test('full display includes fitted equation and distinct characteristic power', () => {
  const lines=scanFitResultLines({valid:true,amplitudeFit:fit,linewidthFit:fit},['formula','P','A','C','r2','rmse','n']);
  assert.ok(lines.includes('S(P) = A√P/(1 + P/P½) + C'));
  assert.ok(lines.includes('ΔB(P) = A√(1 + P/Psat) + C'));
  assert.ok(lines.includes('P½ = 0.25 mW'));
  assert.ok(lines.includes('Psat = 0.25 mW'));
  assert.equal(lines.length,16);
});
