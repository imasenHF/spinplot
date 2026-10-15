import test from 'node:test';
import assert from 'node:assert/strict';
import {clamp,mean,median,ptp,robustSigma,diff,finiteNum,parseNumberList,parseRegions} from './numeric.js';

test('scalar and list statistics preserve original finite-value behavior',()=>{
  assert.equal(clamp(11,0,10),10);
  assert.equal(clamp(-2,0,10),0);
  assert.equal(mean([1,2,3,NaN]),2);
  assert.equal(median([4,1,3,2]),2.5);
  assert.equal(ptp([3,-2,7]),9);
  assert.deepEqual(diff([1,4,9]),[3,5]);
  assert.ok(Number.isNaN(mean([NaN])));
  assert.ok(Number.isNaN(ptp([])));
});

test('robust sigma retains median absolute deviation factor',()=>{
  assert.equal(robustSigma([1,2,3,4,5]),1.4826);
  assert.ok(Number.isNaN(robustSigma([])));
});

test('number and coordinate-region parsers preserve existing syntax',()=>{
  assert.ok(Number.isNaN(finiteNum(null)));
  assert.ok(Number.isNaN(finiteNum('')));
  assert.equal(finiteNum('2.5'),2.5);
  assert.deepEqual(parseNumberList('2, 3; 4 bad 5'),[2,3,4,5]);
  assert.deepEqual(parseRegions('3200-3250, 3550:3600'),[[3200,3250],[3550,3600]]);
  assert.deepEqual(parseRegions('-2--1, 1~2'),[[-2,-1],[1,2]]);
  assert.equal(parseRegions('invalid'),null);
});
