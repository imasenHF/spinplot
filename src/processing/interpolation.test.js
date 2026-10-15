import test from 'node:test';
import assert from 'node:assert/strict';
import {interp1} from './interpolation.js';
test('ascending and descending axes interpolate consistently',()=>{
 const a=interp1([1,2,3],[10,20,30],[0,1,1.5,2.5,3,4]);
 const d=interp1([3,2,1],[30,20,10],[0,1,1.5,2.5,3,4]);
 assert.deepEqual(a.slice(1,5),[10,15,25,30]);
 assert.deepEqual(d.slice(1,5),a.slice(1,5));
 assert.ok(Number.isNaN(a[0]));
 assert.ok(Number.isNaN(a[5]));
});
