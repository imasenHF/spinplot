import assert from 'node:assert/strict';
import { defaults, scanCorrelationData } from './ui.js';

const data = {
  name: 'synthetic-field-power-sweep',
  x: { name: 'Field', unit: 'G', values: [3000, 3001, 3002] },
  y: { name: 'Microwave attenuation', unit: 'dB', values: [0, 10, 20] },
  real: [[1, 2, 3], [2, 4, 6], [4, 8, 12]],
  imag: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
  metadata: { setting: { lineEdit_MB_Power: '1.0', lineEdit_MB_Attenuation: '20' } },
};
const original = structuredClone(data);
const settings = {
  ...defaults(data),
  scanStatisticMin: 3000,
  scanStatisticMax: 3002,
  scanAxisMode: 'attenuation',
};

const expected = {
  mean: [2, 4, 8],
  max: [3, 6, 12],
  min: [1, 2, 4],
  ptp: [2, 4, 8],
  rms: [Math.sqrt(14 / 3), Math.sqrt(56 / 3), Math.sqrt(224 / 3)],
  sum: [6, 12, 24],
};

for (const [statistic, values] of Object.entries(expected)) {
  const result = scanCorrelationData(data, { ...settings, scanStatistic: statistic });
  assert.equal(result.valid, true, statistic + ' should produce valid per-trace features');
  assert.equal(result.statistic, statistic);
  assert.deepEqual(result.scan, [0, 10, 20]);
  result.y.forEach((value, index) => assert.ok(Math.abs(value - values[index]) < 1e-12,
    statistic + ' feature mismatch at trace ' + index));
}

const powerSettings = {
  ...settings,
  scanAxisMode: 'power',
  scanPowerReferenceMW: 100,
};
const powerResult = scanCorrelationData(data, powerSettings);
assert.equal(powerResult.valid, true);
assert.deepEqual(powerResult.xAxis, { name: 'Microwave power', unit: 'mW' });
powerResult.x.forEach((value, index) => {
  const expectedPower = 100 * 10 ** (-[0, 10, 20][index] / 10);
  assert.ok(Math.abs(value - expectedPower) < 1e-12, 'power conversion mismatch at scan point ' + index);
});

const noCalibration = scanCorrelationData(data, {
  ...settings,
  scanAxisMode: 'power',
  scanPowerReferenceMW: '',
});
assert.equal(noCalibration.valid, false);
assert.match(noCalibration.reason, /positive reference power/);

const wrongAxis = scanCorrelationData({
  ...data,
  y: { name: 'Time', unit: 'ms', values: [0, 10, 20] },
}, { ...powerSettings });
assert.equal(wrongAxis.valid, false);
assert.match(wrongAxis.reason, /dB attenuation scan axis/);

assert.deepEqual(data, original, 'Feature extraction must not mutate source matrix, axes or metadata');
console.log('Per-trace feature extraction: mean/max/min/peak-to-peak/RMS/sum, dB-to-mW calibration guards and source immutability passed');
