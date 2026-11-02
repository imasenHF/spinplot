import assert from 'node:assert/strict';
import test from 'node:test';
import { convertScanPowerBounds, scanPowerXAxis, scanPowerXCoordinate } from './scan-x-axis.js';

test('square-root power coordinates affect display values only', () => {
  assert.equal(scanPowerXCoordinate(4, 'sqrt'), 2);
  assert.equal(scanPowerXCoordinate(100, 'sqrt'), 10);
  assert.equal(scanPowerXCoordinate(4, 'power'), 4);
  assert.ok(Number.isNaN(scanPowerXCoordinate(-1, 'sqrt')));
});

test('square-root power axis keeps a physical unit label', () => {
  assert.deepEqual(scanPowerXAxis({ name: 'Microwave power', unit: 'mW' }, 'sqrt'), {
    name: 'Square-root microwave power', unit: 'mW^(1/2)',
  });
  const axis = { name: 'Microwave power', unit: 'mW' };
  assert.equal(scanPowerXAxis(axis, 'power'), axis);
});

test('switching power display modes converts local bounds and clears nonlinear tick steps', () => {
  assert.deepEqual(convertScanPowerBounds({ min: '4', max: '100', step: '2' }, 'power', 'sqrt'), {
    min: '2', max: '10', step: '',
  });
  assert.deepEqual(convertScanPowerBounds({ min: '2', max: '10', step: '' }, 'sqrt', 'power'), {
    min: '4', max: '100', step: '',
  });
  assert.deepEqual(convertScanPowerBounds({ min: '', max: '-2', step: '1' }, 'power', 'sqrt'), {
    min: '', max: '', step: '',
  });
});
