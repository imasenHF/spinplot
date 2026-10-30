import assert from 'node:assert/strict';
import { zFraction, zAtFraction, zRange, zTicks, zoomZ } from './zscale.js';

const cases = [];
function test(name, fn) {
  try { fn(); cases.push({name, result:'PASS'}); }
  catch (error) { cases.push({name, result:'FAIL', error:error.message}); }
}

test('linear endpoints and midpoint', () => {
  assert.equal(zFraction(-2,-2,6),0);
  assert.equal(zFraction(2,-2,6),0.5);
  assert.equal(zFraction(6,-2,6),1);
});
test('positive Log10 endpoints and geometric midpoint', () => {
  assert.equal(zFraction(1,1,100,'log'),0);
  assert.equal(zFraction(10,1,100,'log'),0.5);
  assert.equal(zFraction(100,1,100,'log'),1);
});
test('signed Log/SymLog is monotonic and invertible', () => {
  const values=[-100,-10,-1,0,1,10,100];
  const fractions=values.map(v=>zFraction(v,-100,100,'log'));
  assert.ok(fractions.every(Number.isFinite));
  assert.ok(fractions.every((v,i)=>i===0||v>fractions[i-1]));
  values.forEach((v,i)=>assert.ok(Math.abs(zAtFraction(fractions[i],-100,100,'log')-v)<1e-8));
});
test('visible X/Y selection excludes off-window outliers and ignores non-finite samples', () => {
  const r=zRange([[-999,1,2,999],[NaN,3,Infinity,888],[-777,4,5,777]],[1,2],[0,2]);
  assert.equal(r.min,1); assert.equal(r.max,5);
  assert.equal(r.dataMin,1); assert.equal(r.dataMax,5);
});
test('all-invalid visible range throws', () => {
  assert.throws(()=>zRange([[NaN,Infinity]],[0,1],[0]),/no finite/);
});
test('constant positive signal preserves raw extrema while expanding display bounds', () => {
  const r=zRange([[5,5]],[0,1],[0]);
  assert.equal(r.dataMin,5); assert.equal(r.dataMax,5);
  assert.equal(r.min,0.5); assert.equal(r.max,50);
});
test('constant negative signal preserves raw extrema while expanding display bounds', () => {
  const r=zRange([[-5,-5]],[0,1],[0]);
  assert.equal(r.dataMin,-5); assert.equal(r.dataMax,-5);
  assert.equal(r.min,-5.5); assert.equal(r.max,-4.5);
});
test('constant zero signal expands to a non-degenerate display range', () => {
  const r=zRange([[0,0]],[0,1],[0]);
  assert.equal(r.dataMin,0); assert.equal(r.dataMax,0);
  assert.deepEqual([r.min,r.max],[-1,1]);
});
test('explicit invalid bounds throw', () => {
  assert.throws(()=>zRange([[1,2]],[0,1],[0],{zMin:3,zMax:2}),/less than/);
  assert.throws(()=>zRange([[1,2]],[0,1],[0],{zMin:'x',zMax:2}),/less than/);
});
test('positive Log10 rejects zero and negative values', () => {
  assert.ok(Number.isNaN(zFraction(0,1,100,'log')));
  assert.ok(Number.isNaN(zFraction(-1,1,100,'log')));
});
test('Scientific uses the same linear coordinate mapping', () => {
  for(const v of [-5,0,5]) assert.equal(zFraction(v,-10,10),zFraction(v,-10,10,'scientific'));
});
test('ticks span requested bounds and remain finite', () => {
  for(const [min,max,scale] of [[-10,10,'linear'],[1,100,'log'],[-10,10,'symlog']]) {
    const ticks=zTicks(min,max,scale,5);
    assert.equal(ticks.length,5);
    assert.ok(ticks.every(Number.isFinite));
    assert.ok(Math.abs(ticks[0]-min)<1e-9);
    assert.ok(Math.abs(ticks[4]-max)<1e-9);
  }
});
test('zoom keeps finite ordered bounds', () => {
  for(const [min,max,scale] of [[1,100,'log'],[-10,10,'log'],[-10,10,'linear']]) {
    const bounds=zoomZ(min,max,120,scale);
    assert.ok(bounds[0]<bounds[1]&&bounds.every(Number.isFinite));
  }
});

const failed=cases.filter(c=>c.result==='FAIL');
console.log(JSON.stringify({total:cases.length,passed:cases.length-failed.length,failed:failed.length,cases},null,2));
assert.equal(failed.length,0,'Z scale regression failures: '+JSON.stringify(failed));
