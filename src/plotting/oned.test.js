import test from 'node:test';
import assert from 'node:assert/strict';
import {createDisplayCurves,rangeY,autoRangeX,resolveCurveStyle,markerSampleIndices} from './oned.js';
import {processSubplot} from '../processing/oned.js';
const curves=Object.freeze([Object.freeze({B:Object.freeze([3300,3310,3320]),y:Object.freeze([1,2,3])}),Object.freeze({B:Object.freeze([3300,3310,3320]),y:Object.freeze([2,4,6])})]);
test('Overlay/Stack preserve frozen source; automatic/manual offsets and both directions',()=>{
 assert.deepEqual(createDisplayCurves(curves,{mode:'overlay'}).map(c=>c.yd),[[1,2,3],[2,4,6]]);
 for(const direction of [1,-1])for(const manual of [false,true]){const out=createDisplayCurves(curves,{mode:'stack',offsetMode:manual?'manual':'auto',manualOffsets:'0,3',offsetScale:1.5,offsetDirection:direction});const offset=(manual?3:6)*direction;assert.equal(out[1].offset,offset);assert.deepEqual(out[1].yd,[2+offset,4+offset,6+offset]);assert.notEqual(out[0].yd,curves[0].y);}
 assert.deepEqual(curves[1].y,[2,4,6]);
});
test('processing order: frequency alignment, baseline, scale, display offset',()=>{
 const raw=curves.map((c,i)=>({...c,freq:9.5,name:'c'+i})),sp={curves:[0,1],mode:'stack',offsetMode:'manual',manualOffsets:'0,5'};
 const out=processSubplot(raw,sp,19,{baselineMode:'mean',scaleMode:'manual'}, {0:2,1:3});
 assert.deepEqual(out[0].B,[6600,6620,6640]);assert.deepEqual(out[0].y,[-2,0,2]);assert.deepEqual(out[1].yd,[-1,5,11]);assert.deepEqual(raw[1].y,[2,4,6]);
});
test('large-array ranges ignore missing samples without spreading data',()=>{const n=200000,curve={B:Array.from({length:n},(_,i)=>i),yd:Array.from({length:n},(_,i)=>i===0?NaN:i)};assert.deepEqual(autoRangeX([curve]),[0,n-1]);assert.deepEqual(rangeY([curve],10,20),[9,21]);});

test('per-curve display styles default safely and preserve selected marker shape',()=>{
 assert.deepEqual(resolveCurveStyle({},0),{mode:'line',symbol:'circle'});
 assert.deepEqual(resolveCurveStyle({curveStyles:{2:{mode:'symbols',symbol:'triangle'}}},2),{mode:'symbols',symbol:'triangle'});
 assert.deepEqual(resolveCurveStyle({curveStyles:{2:{mode:'unknown',symbol:'star'}}},2),{mode:'line',symbol:'circle'});
});
test('marker sampling remains bounded and includes both ends',()=>{
 assert.deepEqual(markerSampleIndices(0),[]);
 assert.deepEqual(markerSampleIndices(4),[0,1,2,3]);
 assert.deepEqual(markerSampleIndices(10,4),[0,3,6,9]);
 const sampled=markerSampleIndices(10000);
 assert.ok(sampled.length<=81);
 assert.equal(sampled[0],0);
 assert.equal(sampled.at(-1),9999);
});
