import test from 'node:test';
import assert from 'node:assert/strict';
import {correctBaseline,estimateNoise,applyStackOffsets} from './signal.js';

const B=[3300,3310,3320,3330,3340],y=[2,4,8,4,2];
test('baseline none returns an independent unchanged array',()=>{
 const result=correctBaseline(B,y,{mode:'none'});
 assert.deepEqual(result,y);
 assert.notStrictEqual(result,y);
});
test('baseline mean retains finite-sample mean semantics',()=>{
 assert.deepEqual(correctBaseline(B,y,{mode:'mean'}),[-2,0,4,0,-2]);
 const val=correctBaseline([1,2,3],[1,NaN,3],{mode:'mean'});
 assert.equal(val[0],-1); assert.ok(Number.isNaN(val[1])); assert.equal(val[2],1);
});
test('regional baseline includes boundaries and normalizes reversed regions',()=>{
 const direct=correctBaseline(B,y,{mode:'region',regions:[[3300,3310],[3330,3340]]});
 const reversed=correctBaseline(B,y,{mode:'region',regions:[[3310,3300],[3340,3330]]});
 assert.deepEqual(direct,[-1,1,5,1,-1]);
 assert.deepEqual(reversed,direct);
 assert.throws(()=>correctBaseline(B,y,{mode:'region',regions:null}),/Baseline regions required/);
 assert.throws(()=>correctBaseline(B,y,{mode:'region',regions:[[4000,4100]]}),/no valid points/);
});
test('reference baseline uses the closest coordinate and enforces valid reference',()=>{
 assert.deepEqual(correctBaseline(B,y,{mode:'reference',reference:3328}),[-2,0,4,0,-2]);
 assert.deepEqual(correctBaseline(B.toReversed(),y.toReversed(),{mode:'reference',reference:3328}),[-2,0,4,0,-2]);
 assert.throws(()=>correctBaseline(B,y,{mode:'reference',reference:NaN}),/requires B value/);
});
test('noise estimate on no regions preserves derivative-MAD convention',()=>{
 const x=[0,1,2,3,4,5],signal=[0,1,0,2,0,1];
 const noise=estimateNoise(x,signal,null);
 assert.ok(noise>0&&Number.isFinite(noise));
});
test('noise regions detrend linear backgrounds and accept reversed region endpoints',()=>{
 const x=[0,1,2,3,4,5,6,7],signal=x.map((v,i)=>3*v+2+[0.1,-0.3,0.2,-0.1,0.3,-0.25,0.1,0.05][i]);
 const a=estimateNoise(x,signal,[[0,7]]),b=estimateNoise(x,signal,[[7,0]]);
 assert.ok(a>0&&Number.isFinite(a));
 assert.ok(Math.abs(a-b)<1e-12);
 assert.throws(()=>estimateNoise(x,signal,[[0,1]]),/too few points/);
});
test('offsets are display-only and preserve amplitude data',()=>{
 const curves=[{y:[0,2,1]},{y:[-1,3,0]}];
 const opts={mode:'stack',offsetMode:'auto',offsetScale:'1.2',offsetDirection:1};
 const result=applyStackOffsets(curves,opts);
 assert.deepEqual(result.map(c=>c.offset),[0,4.8]);
 assert.deepEqual(result[1].yd,[3.8,7.8,4.8]);
 assert.deepEqual(curves[1].y,[-1,3,0]);
 assert.deepEqual(applyStackOffsets(curves,{...opts,offsetDirection:-1}).map(c=>c.offset),[-0,-4.8]); // Preserve signed zero from negating all offsets.
 assert.deepEqual(applyStackOffsets(curves,{...opts,offsetScale:''}).map(c=>c.offset),[0,0]); // Empty string was treated as numeric zero in the original implementation.
 assert.deepEqual(applyStackOffsets(curves,{...opts,offsetMode:'manual',manualOffsets:'0, 3'}).map(c=>c.offset),[0,3]);
 const overlay=applyStackOffsets(curves,{...opts,mode:'overlay'});
 assert.deepEqual(overlay.map(c=>c.offset),[0,0]);
});
