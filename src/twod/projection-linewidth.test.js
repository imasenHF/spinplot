import assert from 'node:assert/strict';
import {projections} from './core.js';
const base={
  x:{name:'Field',unit:'G',values:[3300,3310,3320,3330,3340]},
  y:{name:'Attenuation',unit:'dB',values:[6,10,14]},
  z:[[0,4,1,-2,0],[0,2,0,-3,0],[0,1,0,-4,0]]
};
const mean=projections(base,[3300,3340],[6,14],'mean','ptp');
assert.deepEqual(mean.y,[6,5,5], 'Existing peak-to-peak statistic retains its signal range');
assert.equal(mean.sideLinewidth,null);
const widths=projections(base,[3300,3340],[6,14],'mean','linewidth');
assert.deepEqual(widths.y,[20,20,20], 'Side linewidth uses X-field extrema of each Y scan, in G');
assert.equal(widths.sideLinewidth,null);
const both=projections(base,[3300,3340],[6,14],'mean','both');
assert.deepEqual(both.y,[6,5,5], 'Primary side profile is peak-to-peak amplitude');
assert.deepEqual(both.sideLinewidth,[20,20,20], 'Secondary side profile is field linewidth');
// The right projection is NOT derived from the maxima/minima of the
// already-aggregated attenuation-axis projection.
const reversed={...base,x:{...base.x,values:base.x.values.slice().reverse()},
 z:base.z.map(row=>row.slice().reverse())};
assert.deepEqual(projections(reversed,[3300,3340],[6,14],'mean','both').sideLinewidth,[20,20,20]);
const subset=projections(base,[3310,3330],[6,14],'mean','both');
assert.deepEqual(subset.sideLinewidth,[20,20,20]);
const constant={...base,z:[base.z[0],Array(5).fill(0),base.z[2]]};
const partial=projections(constant,[3300,3340],[6,14],'mean','both');
assert.ok(Number.isNaN(partial.sideLinewidth[1]), 'Constant trace has no defensible peak spacing');
assert.equal(partial.y[1],0,'Peak-to-peak amplitude remains zero on a constant trace');
console.log('PASS: projection linewidth per acquired field scan, dual mode, reversed X, legacy statistic and constant traces');
