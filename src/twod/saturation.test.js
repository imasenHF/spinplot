import assert from 'node:assert/strict';
import { peakFeatures, traceFeatures, attenuationToPower, saturationModels, fitSaturation } from './saturation.js';
import { defaults, scanCorrelationData } from './ui.js';

const axis = [3300, 3301, 3302, 3303, 3304];
const f = peakFeatures(axis, [0, 2, 4, -3, 1], [3301, 3304]);
assert.equal(f.valid, true);
assert.equal(f.amplitude, 7);
assert.equal(f.linewidth, 1);
assert.equal(f.xMax, 3302);
assert.equal(f.xMin, 3303);
assert.equal(peakFeatures(axis, [0, 0, 0, 0, 0]).valid, false);
assert.equal(peakFeatures(axis, [1, 2, 3, 4, 5], [3300, 3300.5]).valid, false);
assert.equal(attenuationToPower(20, 100), 1);
assert.ok(Number.isNaN(attenuationToPower(0, 0)));

const matrix = {
  name: 'synthetic', x: { name: 'Magnetic field', unit: 'G', values: axis },
  y: { name: 'Microwave attenuation', unit: 'dB', values: [0, 10, 20, 30, 40] },
  real: [[0, 2, 4, -3, 1], [0, 4, 8, -2, 1], [0, 1, 3, -5, 1], [0, 3, 6, -4, 2], [0, 1, 5, -3, 0]],
  imag: Array.from({ length: 5 }, () => [0, 0, 0, 0, 0]), metadata: {},
};
const snapshot = JSON.stringify(matrix);
const extracted = traceFeatures(matrix, 'real', [3301, 3304]);
assert.equal(extracted.valid, true);
assert.deepEqual(extracted.points.map(point => point.amplitude), [7, 10, 8, 10, 8]);
assert.deepEqual(extracted.points.map(point => point.linewidth), [1, 1, 1, 1, 1]);
const settings = {
  ...defaults(matrix), scanStatisticMin: 3301, scanStatisticMax: 3304,
  scanFeatureMode: 'both', scanAxisMode: 'power', scanPowerReferenceMW: 100,
};
const scan = scanCorrelationData(matrix, settings);
assert.equal(scan.valid, true);
assert.deepEqual(scan.y, [7, 10, 8, 10, 8]);
assert.deepEqual(scan.secondary, [1, 1, 1, 1, 1]);
assert.equal(scan.secondaryAxis.unit, 'G');
scan.x.forEach((power, index) => assert.ok(Math.abs(power - [100, 10, 1, 0.1, 0.01][index]) < 1e-12));
assert.equal(JSON.stringify(matrix), snapshot);

const powers = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 4, 8, 12, 20, 40, 80, 160];
for (const b of [1.2, 2, 3.4]) {
  const points = powers.map((power, index) => ({
    index, power, signal: saturationModels.amplitude(power, 4, 12, b),
  }));
  const result = fitSaturation(points, { model: 'amplitude' });
  assert.equal(result.valid, true, 'Bruker amplitude fit: ' + result.reason);
  assert.ok(Math.abs(result.parameters.I0 / 4 - 1) < 0.002, 'I0=' + result.parameters.I0);
  assert.ok(Math.abs(result.parameters.b - b) < 0.003, 'b=' + result.parameters.b);
  assert.ok(Math.abs(result.parameters.Phalf / 12 - 1) < 0.002, 'Phalf=' + result.parameters.Phalf);
  assert.ok(result.rmse < 1e-6);
  assert.ok(result.r2 > 0.999999);
}

const generalPoints = powers.map((power, index) => ({
  index, power, signal: saturationModels.amplitude(power, 5.5, 17, 1.65),
}));
const fixedI0Fit = fitSaturation(generalPoints, {
  model: 'amplitude', fitI0: false, fixedI0: 5.5,
});
assert.equal(fixedI0Fit.valid, true);
assert.ok(Math.abs(fixedI0Fit.parameters.b - 1.65) < 0.003);
assert.ok(Math.abs(fixedI0Fit.parameters.Phalf - 17) / 17 < 0.002);

const fixedBFit = fitSaturation(generalPoints, {
  model: 'amplitude', fitB: false, fixedB: 1.65,
});
assert.equal(fixedBFit.valid, true);
assert.ok(Math.abs(fixedBFit.parameters.I0 - 5.5) / 5.5 < 0.002);
assert.ok(Math.abs(fixedBFit.parameters.Phalf - 17) / 17 < 0.002);

const fixedPhalfFit = fitSaturation(generalPoints, {
  model: 'amplitude', fitPhalf: false, fixedPhalf: 17,
});
assert.equal(fixedPhalfFit.valid, true);
assert.ok(Math.abs(fixedPhalfFit.parameters.I0 - 5.5) / 5.5 < 0.002);
assert.ok(Math.abs(fixedPhalfFit.parameters.b - 1.65) < 0.003);

const allFixedFit = fitSaturation(generalPoints, {
  model: 'amplitude', fitI0: false, fixedI0: 5.5,
  fitB: false, fixedB: 1.65, fitPhalf: false, fixedPhalf: 17,
});
assert.equal(allFixedFit.valid, true);
assert.ok(allFixedFit.rmse < 1e-10);
assert.equal(allFixedFit.parameterFit.I0, false);
assert.equal(allFixedFit.parameterFit.b, false);
assert.equal(allFixedFit.parameterFit.Phalf, false);

assert.equal(fitSaturation(generalPoints, { model: 'amplitude', fitB: false, fixedB: 0 }).valid, false);
assert.equal(fitSaturation(generalPoints, { model: 'amplitude', fitPhalf: false, fixedPhalf: -1 }).valid, false);

const linewidthPowers = [0.1, 0.3, 1, 3, 6, 10, 20, 40, 80, 150, 300, 600];
for (const [a, pSat, c] of [[2, 18, 0], [3, 9, 2]]) {
  const points = linewidthPowers.map((power, index) => ({
    index, power, signal: saturationModels.linewidth(power, a, pSat, c),
  }));
  const result = fitSaturation(points, { model: 'linewidth', allowOffset: c !== 0 });
  assert.equal(result.valid, true, 'Linewidth fit: ' + result.reason);
  assert.ok(Math.abs(result.parameters.P / pSat - 1) < 0.01);
  assert.ok(Math.abs(result.parameters.A / a - 1) < 0.01);
  assert.ok(Math.abs(result.parameters.C - c) < 0.05);
  assert.ok(result.rmse < 1e-5);
  assert.ok(result.r2 > 0.99999);
}

const controlPoints = powers.map((power, index) => ({
  index, power, signal: saturationModels.amplitude(power, 4, 12, 2),
}));
const excludedFit = fitSaturation(controlPoints, { model: 'amplitude', excludedIndices: [0, 1], minPower: 0.05, maxPower: 40 });
assert.equal(excludedFit.valid, true);
assert.equal(excludedFit.n, powers.length - 2);
assert.ok(excludedFit.parameters.Phalf >= 0.05 && excludedFit.parameters.Phalf <= 40);

const configured = {
  ...settings, scanFitAmplitude: true, scanFitExcluded: '0,1',
  scanFitPowerMinMW: 1, scanFitPowerMaxMW: 100,
};
const configuredResult = scanCorrelationData(matrix, configured);
assert.equal(configuredResult.amplitudeFit.valid, false, 'Insufficient remaining scan points must be reported');
assert.match(configuredResult.amplitudeFit.reason, /At least/);
const invalidExclusions = scanCorrelationData(matrix, { ...configured, scanFitExcluded: 'not-an-index' });
assert.equal(invalidExclusions.amplitudeFit.valid, false);
assert.match(invalidExclusions.amplitudeFit.reason, /non-negative integers/);
assert.equal(fitSaturation([{ power: 1, signal: 1 }], {}).valid, false);
assert.equal(fitSaturation([1, 2, 3, 4, 5].map(power => ({ power, signal: 1 })), { model: 'invalid' }).valid, false);
assert.equal(fitSaturation([1, 1, 1, 1].map((power, index) => ({ power, signal: index }))).valid, false);
console.log('PASS: peak features, Bruker three-parameter saturation fitting, independent parameter constraints and linewidth fit');
