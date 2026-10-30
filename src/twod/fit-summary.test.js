import assert from 'node:assert/strict';
import test from 'node:test';
import { scanFitResultLines } from './fit-summary.js';

const fit = { valid: true, parameters: { A: 3, P: 0.25, PHalf: 0.25 * (2-Math.sqrt(3))**2, C: 1 }, r2: 0.99456, rmse: 0.12, n: 8 };
test('scan fit results are hidden by default', () => {
  assert.deepEqual(scanFitResultLines({ valid: true, amplitudeFit: fit }), []);
});
test('P_sat and P_half are distinct results', () => {
  const lines = scanFitResultLines({ valid: true, amplitudeFit: fit }, ['P','half']);
  assert.deepEqual(lines,['Amplitude','Psat = 0.25 mW','P½ = 0.017949 mW']);
});
test('invalid fits have no plotted result', () => {
  assert.deepEqual(scanFitResultLines({ valid: true, amplitudeFit: { valid: false } }, ['P']), []);
});
test('linewidth does not inherit the amplitude half-maximum power', () => {
  const result=scanFitResultLines({valid:true,amplitudeFit:fit,linewidthFit:fit},['half','n']);
  assert.deepEqual(result,['Amplitude','P½ = 0.017949 mW','No. of points = 8','Linewidth','No. of points = 8']);
});
test('complete summary uses two fitted models and descriptive point count', () => {
  const lines=scanFitResultLines({valid:true,amplitudeFit:fit,linewidthFit:fit},['formula','P','half','A','C','r2','rmse','n']);
  assert.ok(lines.includes('S(P) = A√P/(1 + P/Psat) + C'));
  assert.ok(lines.includes('ΔB(P) = A√(1 + P/Psat) + C'));
  assert.equal(lines.filter(x=>x==='Psat = 0.25 mW').length,2);
  assert.ok(lines.includes('P½ = 0.017949 mW'));
  assert.equal(lines.filter(x=>x==='No. of points = 8').length,2);
});
