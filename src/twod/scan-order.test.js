import assert from 'node:assert/strict';
import {test} from 'node:test';
import {SCAN_DERIVED_IDS,normalizeScanDerivedOrder,moveScanDerivedOrder,sortScanDerived} from './scan-order.js';

const {amplitude,linewidth,amplitudeFit,linewidthFit,excludedAmplitude,statistic} = SCAN_DERIVED_IDS;

test('Default stacking matches current data inventory; input is not mutated',()=>{
  const items=[{index:linewidthFit},{index:amplitude},{index:amplitudeFit},{index:linewidth}];
  const output=sortScanDerived(items,null);
  assert.deepEqual(output.map(x=>x.index),[amplitude,linewidth,amplitudeFit,linewidthFit]);
  assert.deepEqual(items.map(x=>x.index),[linewidthFit,amplitude,amplitudeFit,linewidth]);
});

test('Moving a fit behind measured amplitudes changes true painting order',()=>{
  const order=moveScanDerivedOrder(undefined,amplitudeFit,amplitude);
  assert.ok(order.indexOf(amplitudeFit)<order.indexOf(amplitude));
  const curves=[{index:amplitude},{index:amplitudeFit},{index:linewidth}];
  assert.deepEqual(sortScanDerived(curves,order).map(x=>x.index),
    [amplitudeFit,amplitude,linewidth]);
  assert.deepEqual(sortScanDerived(curves,order).map(x=>x.index).at(-1),linewidth);
  const front=moveScanDerivedOrder(order,amplitude,linewidth);
  assert.deepEqual(sortScanDerived(curves,front).map(x=>x.index),
    [amplitudeFit,linewidth,amplitude]);
});

test('Hidden curve identities remain stable through mode switching and exclusion',()=>{
  const order=moveScanDerivedOrder(null,linewidth,amplitude);
  assert.deepEqual(sortScanDerived([{index:amplitude},{index:linewidth}],order)
    .map(x=>x.index),[linewidth,amplitude]);
  assert.deepEqual(sortScanDerived([
    {index:amplitudeFit},{index:excludedAmplitude},{index:amplitude},{index:linewidth}
  ],order).map(x=>x.index),[linewidth,amplitude,amplitudeFit,excludedAmplitude]);
  assert.deepEqual(sortScanDerived([{index:statistic}],order).map(x=>x.index),[statistic]);
});

test('Saved order is validated without changing legacy project semantics',()=>{
  const order=normalizeScanDerivedOrder([-103,-101,-103,'-102',0,NaN]);
  assert.equal(order[0],amplitudeFit);
  assert.equal(order[1],amplitude);
  assert.equal(order.length,Object.keys(SCAN_DERIVED_IDS).length);
  assert.equal(new Set(order).size,order.length);
  assert.deepEqual(moveScanDerivedOrder(order,999,amplitude),order);
  assert.deepEqual(moveScanDerivedOrder(order,amplitude,amplitude),order);
});

test('Source dataset is not a movable derived identity',()=>{
  const order=normalizeScanDerivedOrder(null);
  assert.equal(order.includes(0),false);
  assert.equal(order.includes(1),false);
});
