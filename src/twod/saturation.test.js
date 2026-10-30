import assert from 'node:assert/strict';
import {peakFeatures,traceFeatures,attenuationToPower,saturationModels,fitSaturation,amplitudeHalfMaximumPower} from './saturation.js';
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
scan.x.forEach((power,i)=>assert.ok(Math.abs(power-[100,10,1,.1,.01][i])<1e-12));
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
const controlPoints=[.1,.3,1,3,6,10,20,40,80,150].map((power,index)=>({
 index,power,signal:saturationModels.amplitude(power,5,12,0)
}));
const halfFit=fitSaturation(controlPoints,{model:'amplitude'});
assert.ok(halfFit.valid);
assert.ok(Math.abs(halfFit.parameters.PHalf/halfFit.parameters.P-(2-Math.sqrt(3))**2)<1e-12);
const excludedFit=fitSaturation(controlPoints,{model:'amplitude',excludedIndices:[0,1],minPower:1,maxPower:40});
assert.equal(excludedFit.valid,true);
assert.equal(excludedFit.n,8);
assert.ok(excludedFit.parameters.P>=1&&excludedFit.parameters.P<=40);
const configured={...settings,scanFitAmplitude:true,scanFitExcluded:'0,1',
 scanFitPowerMinMW:1,scanFitPowerMaxMW:100};
const configuredResult=scanCorrelationData(matrix,configured);
assert.equal(configuredResult.valid,true);
assert.equal(configuredResult.amplitudeFit.valid,false,'Insufficient remaining scan points must be reported');
assert.match(configuredResult.amplitudeFit.reason,/At least/);
const invalidExclusions=scanCorrelationData(matrix,{...configured,scanFitExcluded:'not-an-index'});
assert.equal(invalidExclusions.amplitudeFit.valid,false);
assert.match(invalidExclusions.amplitudeFit.reason,/non-negative integers/);
assert.equal(fitSaturation([{power:1,signal:1}],{}).valid,false);
assert.equal(fitSaturation([1,2,3,4,5].map(i=>({power:i,signal:1})),{model:'invalid'}).valid,false);
assert.equal(fitSaturation([1,1,1,1].map((i,index)=>({power:i,signal:index}))).valid,false);
console.log('PASS: peak features, linewidth coordinate separation, dual feature scan and both saturation models');

// P_sat is the amplitude model peak; P_1/2 is the ascending-branch
// half-peak power after subtracting the fitted offset.
const characteristic=17.52736;
const halfPower=amplitudeHalfMaximumPower(characteristic);
assert.ok(halfPower>0&&halfPower<characteristic);
assert.ok(Math.abs(halfPower/characteristic-(2-Math.sqrt(3))**2)<1e-12);
assert.ok(Number.isNaN(amplitudeHalfMaximumPower(-1)));
const unsaturated=power=>7*Math.sqrt(power);
const saturated=power=>saturationModels.amplitude(power,7,characteristic,0);
assert.ok(Math.abs(saturated(halfPower)/saturated(characteristic)-0.5)<1e-12);
assert.ok(Math.abs(saturated(characteristic)/unsaturated(characteristic)-0.5)<1e-12);
assert.ok(saturated(characteristic)>saturated(characteristic/2));
assert.ok(saturated(characteristic)>saturated(characteristic*2));
assert.ok(Math.abs(saturated(characteristic/19)/unsaturated(characteristic/19)-0.95)<1e-12);
