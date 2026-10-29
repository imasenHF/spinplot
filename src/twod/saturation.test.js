import assert from 'node:assert/strict';
import {peakFeatures,traceFeatures,attenuationToPower,saturationModels,fitSaturation} from './saturation.js';
import {defaults,scanCorrelationData} from './ui.js';

const axis=[3300,3301,3302,3303,3304];
const f=peakFeatures(axis,[0,2,4,-3,1],[3301,3304]);
assert.equal(f.valid,true);
assert.equal(f.amplitude,7);
assert.equal(f.linewidth,1);
assert.equal(f.xMax,3302);
assert.equal(f.xMin,3303);
assert.equal(peakFeatures(axis,[0,0,0,0,0]).valid,false);
assert.equal(peakFeatures(axis,[1,2,3,4,5],[3300,3300.5]).valid,false);
assert.equal(attenuationToPower(20,100),1);
assert.ok(Number.isNaN(attenuationToPower(0,0)));

const matrix={name:'synthetic',x:{name:'Magnetic field',unit:'G',values:axis},
 y:{name:'Microwave attenuation',unit:'dB',values:[0,10,20,30,40]},
 real:[[0,2,4,-3,1],[0,4,8,-2,1],[0,1,3,-5,1],[0,3,6,-4,2],[0,1,5,-3,0]],
 imag:Array.from({length:5},()=>[0,0,0,0,0]),metadata:{}};
const snapshot=JSON.stringify(matrix);
const extracted=traceFeatures(matrix,'real',[3301,3304]);
assert.equal(extracted.valid,true);
assert.deepEqual(extracted.points.map(p=>p.amplitude),[7,10,8,10,8]);
assert.deepEqual(extracted.points.map(p=>p.linewidth),[1,1,1,1,1]);
const settings={...defaults(matrix),scanStatisticMin:3301,scanStatisticMax:3304,
 scanFeatureMode:'both',scanAxisMode:'power',scanPowerReferenceMW:100};
const scan=scanCorrelationData(matrix,settings);
assert.equal(scan.valid,true);
assert.deepEqual(scan.y,[7,10,8,10,8]);
assert.deepEqual(scan.secondary,[1,1,1,1,1]);
assert.equal(scan.secondaryAxis.unit,'G');
assert.deepEqual(scan.x,[100,10,1,.1,.01]);
assert.equal(JSON.stringify(matrix),snapshot);

for(const [model,A,q,C] of [['amplitude',5,12,0],['linewidth',2,18,0]]){
 const powers=[.1,.3,1,3,6,10,20,40,80,150,300,600];
 const points=powers.map((power,index)=>({index,power,signal:saturationModels[model](power,A,q,C)}));
 const result=fitSaturation(points,{model,allowOffset:false});
 assert.equal(result.valid,true,model+': '+result.reason);
 assert.ok(Math.abs(result.parameters.P/q-1)<.01,model+': '+result.parameters.P);
 assert.ok(Math.abs(result.parameters.A/A-1)<.01);
 assert.ok(result.rmse<1e-5);
 assert.ok(result.r2>.99999);
 const withOffset=points.map(p=>({...p,signal:p.signal+2}));
 const offsetFit=fitSaturation(withOffset,{model,allowOffset:true});
 assert.equal(offsetFit.valid,true);
 assert.ok(Math.abs(offsetFit.parameters.C-2)<.05,model+' offset '+offsetFit.parameters.C);
}
assert.equal(fitSaturation([{power:1,signal:1}],{}).valid,false);
assert.equal(fitSaturation([1,2,3,4,5].map(i=>({power:i,signal:1})),{model:'invalid'}).valid,false);
assert.equal(fitSaturation([1,1,1,1].map((i,index)=>({power:i,signal:index}))).valid,false);
console.log('PASS: peak features, linewidth coordinate separation, dual feature scan and both saturation models');
