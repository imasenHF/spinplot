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
test('Bruker amplitude summary places P-half above paired parameter rows', () => {
  const lines = scanFitResultLines({ valid: true, amplitudeFit },
    ['formula', 'I0', 'b', 'half', 'r2', 'rmse', 'n']);
  assert.deepEqual(lines, [
    'Amplitude',
    'Spp(P) = I₀·sqrt(P)/(1 + P/P½)^(b/2)',
    'P½ = 12.5 mW',
    'I₀ = 3.25\tb = 1.4',
    'R² = 0.99456\tRMSE = 0.12',
    'No. of points = 8',
  ]);
});
test('invalid fits have no plotted result', () => {
  assert.deepEqual(scanFitResultLines({ valid: true, amplitudeFit: { valid: false } }, ['I0']), []);
});
test('amplitude and linewidth summaries use their own parameter sets', () => {
  const lines = scanFitResultLines({ valid: true, amplitudeFit, linewidthFit },
    ['formula', 'I0', 'b', 'half', 'P', 'A', 'C', 'r2', 'rmse', 'n']);
  assert.ok(lines.includes('Spp(P) = I₀·sqrt(P)/(1 + P/P½)^(b/2)'));
  assert.ok(lines.includes('ΔB(P) = A·sqrt(1 + P/Psat) + C'));
  assert.ok(lines.includes('I₀ = 3.25\tb = 1.4'));
  assert.ok(lines.includes('P½ = 12.5 mW'));
  assert.ok(lines.includes('R² = 0.99456\tRMSE = 0.12'));
  assert.ok(lines.includes('R² = 0.992    RMSE = 0.2'));
  assert.ok(lines.includes('Psat = 0.25 mW'));
  assert.ok(lines.includes('C = 1'));
  assert.equal(lines.filter(line => line === 'No. of points = 8').length, 2);
});


test('amplitude pairs I0 with b and R-squared with RMSE, with single-field fallbacks', () => {
  const lines = scanFitResultLines({ valid: true, amplitudeFit }, ['I0', 'b', 'r2', 'rmse']);
  assert.deepEqual(lines, [
    'Amplitude',
    'I₀ = 3.25\tb = 1.4',
    'R² = 0.99456\tRMSE = 0.12',
  ]);
  assert.deepEqual(scanFitResultLines({ valid: true, amplitudeFit }, ['I0']), [
    'Amplitude', 'I₀ = 3.25',
  ]);
  assert.deepEqual(scanFitResultLines({ valid: true, amplitudeFit }, ['b', 'rmse']), [
    'Amplitude', 'b = 1.4', 'RMSE = 0.12',
  ]);
});

test('fit residuals preserve fitted residual values and displayed power coordinates', () => {
  const data = { valid: true, amplitudeFit: { ...amplitudeFit, points: [
    { index: 1, power: 4, residual: 0.2 },
    { index: 3, power: 9, residual: -0.1 },
    { index: 4, power: 16, residual: NaN },
  ] } };
  const [series] = scanFitResidualSeries(data, {
    amplitude: true, linewidth: false, displayX: Math.sqrt,
  });
  assert.equal(series.label, 'Amplitude residual');
  assert.equal(series.unit, '');
  assert.equal(series.curveIndex, -103);
  assert.equal(series.points.length, 2);
  assert.deepEqual(series.points.map(point => point.index), [1, 3]);
  assert.ok(Math.abs(series.points[0].x - 2) < 1e-12);
  assert.ok(Math.abs(series.points[0].y - 0.2) < 1e-12);
  assert.ok(Math.abs(series.points[1].x - 3) < 1e-12);
  assert.ok(Math.abs(series.points[1].y + 0.1) < 1e-12);
  assert.equal(series.rmse, 0.12);
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

test('relative residuals use absolute fitted denominators and their own percentage RMSE', () => {
  const data = { valid:true, amplitudeFit:{ ...amplitudeFit, points:[
    {index:0,power:4,fitted:2,residual:0.4},
    {index:1,power:9,fitted:-4,residual:-0.4},
  ]} };
  const before = JSON.stringify(data);
  const [relative] = scanFitResidualSeries(data,{mode:'relative',displayX:Math.sqrt});
  assert.deepEqual(relative.points,[{index:0,x:2,y:20},{index:1,x:3,y:-10}]);
  assert.equal(relative.label,'Amplitude relative residual');
  assert.equal(relative.unit,'%');
  assert.ok(Math.abs(relative.rmse-Math.sqrt(250))<1e-12);
  assert.equal(relative.omittedCount,0);
  assert.equal(scanFitResidualSeries(data)[0].rmse,amplitudeFit.rmse);
  assert.equal(JSON.stringify(data),before,'Display mode must not mutate fit values or observations');
});
test('relative residuals guard zero and near-zero fits independently of signal units', () => {
  for(const scale of [1e-15,1,1e15]){
    const fit = {...linewidthFit, points:[
      {index:0,power:1,fitted:2*scale,residual:0.2*scale},
      {index:1,power:2,fitted:0,residual:scale},
      {index:2,power:3,fitted:1e-13*scale,residual:scale},
      {index:3,power:4,fitted:NaN,residual:scale},
    ]};
    const [series] = scanFitResidualSeries({valid:true,linewidthFit:fit},{mode:'relative',linewidthUnit:'G'});
    assert.equal(series.unit,'%');
    assert.equal(series.omittedCount,3);
    assert.equal(series.points.length,1);
    assert.ok(Math.abs(series.points[0].y-10)<1e-12);
    assert.ok(Math.abs(series.rmse-10)<1e-12);
  }
});
test('all-zero fitted values retain an empty relative lane with undefined count and no RMSE', () => {
  const [series] = scanFitResidualSeries({valid:true,amplitudeFit:{...amplitudeFit,points:[
    {index:0,power:1,fitted:0,residual:1},
    {index:1,power:2,fitted:0,residual:0},
  ]}},{mode:'relative'});
  assert.deepEqual(series.points,[]);
  assert.equal(series.rmse,null);
  assert.equal(series.omittedCount,2);
});
