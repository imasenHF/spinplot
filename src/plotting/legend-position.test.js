import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveLegendPosition } from './legend-position.js';

test('new subplot inherits global legend position', () => {
  assert.equal(resolveLegendPosition('inherit','lower_left'),'lower_left');
  assert.equal(resolveLegendPosition(undefined,'outside_top'),'outside_top');
  assert.equal(resolveLegendPosition('inherit'),'upper_right');
});
test('explicit subplot position overrides global, including outside positions', () => {
  assert.equal(resolveLegendPosition('upper_center','outside_right'),'upper_center');
  assert.equal(resolveLegendPosition('outside_right','lower_left'),'outside_right');
});
test('legacy auto and invalid values retain a safe inside fallback', () => {
  assert.equal(resolveLegendPosition('auto','outside_top'),'upper_right');
  assert.equal(resolveLegendPosition('unknown','lower_left'),'upper_right');
});
