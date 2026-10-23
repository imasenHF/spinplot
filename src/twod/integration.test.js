import assert from 'node:assert/strict';
import {continuousPalettePosition} from './palettes.js';
import {axisKind,fieldToGauss} from './core.js';
import {defaults,render,projectionColor,projectionCsv,scanCorrelationData,overlapData,stackRows,model,plotInsets,sharedMainInsets,fitMainColumns} from './ui.js';
assert.equal(continuousPalettePosition(0,1),0);assert.equal(continuousPalettePosition(0,4),0);assert.equal(continuousPalettePosition(3,4),1);assert.equal(continuousPalettePosition(1,3),0.5);
for(const [name,unit,kind]of [['Power','mW','power'],['Angle','deg','angle'],['Temperature','K','temperature'],['Modulation amplitude','mT','modulation'],['Delay','ns','time'],['Field','mT','field']])assert.equal(axisKind({name,unit}),kind);
assert.equal(fieldToGauss({name:'Modulation amplitude',unit:'G'}),null);
assert.equal(fieldToGauss({name:'Field',unit:'mT'}),10);
const d={name:'PRIVATE_FILE.DSC',x:{name:'Power',unit:'mW',values:[1,2]},y:{name:'Field',unit:'mT',values:[300,310]},real:[[1,2],[3,4]],imag:[[0,0],[0,0]]};
const s=defaults(d);assert.equal(s.swap,true);assert.equal(projectionColor(s,{scheme:'matlab'}),'#0072BD');s.projectionScheme='jacs';assert.equal(projectionColor(s,{scheme:'matlab'}),'#1F5A85');s.scheme='plasma';assert.equal(projectionColor(s,{scheme:'matlab'}),'#1F5A85');
function draw(s,title='',data=d){const texts=[];const ctx=new Proxy({drawImage:undefined,fillText:(...a)=>texts.push(a),measureText:t=>({width:String(t).length*7})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});const g=render(ctx,data,s,{cellX:0,cellY:0,cellW:1000,cellH:700},'Arial',{text:'#000',axis:'#000'},title,{scheme:'matlab',g:{show:true,decimals:3,label:'g factor',titleDistance:22},frequency:9.85,gTicks:(lo,hi)=>[(lo+hi)/2]});return {texts,g};}
const {texts,g}=draw(s,'My spectrum');assert(!texts.some(a=>a[0]===d.name));assert.equal(texts.find(a=>a[0]==='My spectrum')[1],g.titleCenter);assert(texts.some(a=>a[0]==='g factor'));assert(!draw(s).texts.some(a=>a[0]===d.name));s.swap=false;s.xMin=1;s.xMax=2;s.yMin=300;s.yMax=310;s.projectionXMin=1;s.projectionXMax=2;s.projectionYMin=300;s.projectionYMax=310;assert(draw(s).texts.some(a=>a[0]==='g factor'));assert(projectionCsv(d,s).includes('projectionXRange'));
console.log('Shared palette, title center, both magnetic-axis orientations, units and projection CSV passed');

const ms=defaults(d);assert.equal(ms.projectionGapX,20);assert.equal(ms.projectionGapY,20);ms.mode='stack';ms.step=1;assert.equal(stackRows(model(d,ms),ms).length,2);ms.step=2;assert.equal(stackRows(model(d,ms),ms).length,1);
const projectionDefaults=defaults(d);projectionDefaults.showScanCorrelation=false;const prs=draw(projectionDefaults).g.projectionRegions;assert.equal(prs.length,2);assert.equal(prs[0].projection,'top');assert.equal(prs[1].projection,'side');assert.equal(prs[0].xmin,300);assert.equal(prs[1].ymax,2);
const correlationDefaults=defaults(d),correlationDraw=draw(correlationDefaults);assert.equal(correlationDefaults.showScanCorrelation,false);assert.equal(correlationDraw.g.scanCorrelationRegion,undefined);assert(!correlationDraw.texts.some(a=>String(a[0]).includes('Y projection vs scan')));
const limits=defaults(d);limits.xProjectionMin=-10;limits.xProjectionMax=10;assert.equal(draw(limits).g.projectionRegions[0].ymin,-10);assert.equal(draw(limits).g.projectionRegions[0].ymax,10);
const longAxisData={...d,y:{...d.y,name:'Microwave attenuation'}};const longAxisSettings={...defaults(longAxisData),swap:false,yMode:'rms',showScanCorrelation:false};const wrappedTitle=draw(longAxisSettings,'',longAxisData).texts.map(a=>a[0]);assert(wrappedTitle.includes('Microwave attenuation'));assert(wrappedTitle.includes('projection (rms)'));assert(!wrappedTitle.includes('Microwave attenuation projection (rms)'));
console.log('Projection geometry, wrapped right-projection titles, intensity overrides, default gaps and stack decimation passed');

// Equal spans share the drawable main frame, including mixed g visibility.
const box={cellW:600,cellH:500},opts={axisSize:14,g:{show:false,titleDistance:22},frequency:9.85};const map=defaults(d),noG=plotInsets(d,map,box,'',opts),withG=plotInsets(d,map,box,'',{...opts,g:{show:true,titleDistance:22}});const entries=[{index:0,box,insets:{left:56,right:16,top:34,bottom:34},twoD:false},{index:1,box,insets:noG,twoD:true},{index:2,box,insets:withG,twoD:true}];const common=sharedMainInsets(entries);assert.deepEqual(common.get(0),common.get(1));assert.deepEqual(common.get(1),common.get(2));for(const entry of entries)for(const k of ['left','right','top','bottom'])assert(common.get(entry.index)[k]>=entry.insets[k]);const plain=sharedMainInsets([{index:0,box,insets:{left:56,right:16,top:10,bottom:34}},{index:1,box,insets:{left:56,right:16,top:45,bottom:34}}]);assert.equal(plain.get(0).top,45);assert.equal(plain.get(1).top,45);assert.equal(sharedMainInsets([{index:0,box,insets:noG},{index:1,box:{cellW:1200,cellH:500},insets:withG}]).size,0);console.log('Equal-span main frames: mixed 1D/2D, g on/off; explicit unequal spans preserved');

for(const [top,side] of [[true,true],[true,false],[false,true],[false,false]]){const cfg=defaults(d);cfg.showScanCorrelation=false;cfg.showXProjection=top;cfg.showYProjection=side;const r=draw(cfg);assert.deepEqual(r.g.projectionRegions.map(x=>x.projection),[...(top?['top']:[]),...(side?['side']:[])]);assert.equal(r.texts.some(x=>String(x[0]).includes('projection (mean)')),top);assert.equal(r.texts.some(x=>String(x[0]).includes('projection (rms)')),side);}
const labels=defaults(d);labels.showScanCorrelation=false;const allLabels=draw(labels).texts.map(x=>x[0]);labels.showXProjectionRange=false;labels.showYProjectionRange=false;labels.showXProjectionTitle=false;labels.showYProjectionTitle=false;const hiddenLabels=draw(labels);assert.equal(hiddenLabels.g.projectionRegions.length,2);assert(hiddenLabels.texts.length<allLabels.length);assert(!hiddenLabels.texts.some(x=>String(x[0]).includes('projection (')));
const packed=fitMainColumns(entries.map((e,i)=>({...e,col:i+1})),3,1700);assert(Math.abs(packed.widths.reduce((a,b)=>a+b,0)-1700)<1e-8);for(let i=0;i<3;i++)assert(Math.abs(packed.widths[i]-packed.insets[i].left-packed.insets[i].right-packed.width)<1e-8);assert(packed.widths[0]<packed.widths[1]);const hidden=defaults(d);hidden.showScanCorrelation=false;hidden.showYProjection=false;const hiddenInsets=plotInsets(d,hidden,box,'',opts);assert(hiddenInsets.right<noG.right);assert.equal(hiddenInsets.rightFraction,0);console.log('Independent projection visibility and compact equal-width main columns passed');

const powerSweep={
 name:'synthetic-power-sweep',
 x:{name:'Field',unit:'G',values:[3000,3001,3002]},
 y:{name:'Microwave attenuation',unit:'dB',values:[20,21,22]},
 real:[[1,2,3],[2,4,6],[4,8,12]],
 imag:[[0,0,0],[0,0,0],[0,0,0]],
 metadata:{setting:{lineEdit_MB_Power:'1.0',lineEdit_MB_Attenuation:'20'}}
};
const powerSettings=defaults(powerSweep);
assert.equal(powerSettings.showScanCorrelation,false);
assert.equal(powerSettings.scanPowerReferenceMW,100);
assert.equal('scanPowerReferenceAttenuationDB' in powerSettings,false);
let corr=scanCorrelationData(powerSweep,powerSettings);
assert.equal(corr.valid,true);
assert.deepEqual(corr.x,[20,21,22]);
assert.deepEqual(corr.y,[Math.sqrt(14/3),Math.sqrt(56/3),Math.sqrt(224/3)]);
powerSettings.scanAxisMode='power';
corr=scanCorrelationData(powerSweep,powerSettings);
assert.equal(corr.valid,true);
assert.equal(corr.xAxis.name,'Microwave power');
assert.equal(corr.xAxis.unit,'mW');
assert(Math.abs(corr.x[0]-1)<1e-12);
assert(Math.abs(corr.x[1]-10**(-0.1))<1e-12);
assert(Math.abs(corr.x[2]-10**(-0.2))<1e-12);
const legacyPowerSettings={...defaults(powerSweep),scanAxisMode:'power',scanPowerReferenceMW:1,scanPowerReferenceAttenuationDB:20};
const migratedPower=scanCorrelationData(powerSweep,legacyPowerSettings);
assert.equal(migratedPower.valid,true);
assert(Math.abs(migratedPower.x[0]-1)<1e-12);
assert.equal('scanPowerReferenceAttenuationDB' in legacyPowerSettings,false);
const independentSettings={...defaults(powerSweep),scanStatistic:'mean',scanStatisticMin:3001,scanStatisticMax:3002,yMode:'min',projectionXMin:3000,projectionXMax:3000,projectionYMin:22,projectionYMax:22};
const independent=scanCorrelationData(powerSweep,independentSettings);
assert.equal(independent.valid,true);
assert.equal(independent.statistic,'mean');
assert.deepEqual(independent.statisticRange,[3001,3002]);
assert.deepEqual(independent.y,[2.5,5,10]);
assert.deepEqual(independent.scan,[20,21,22]);
const legacyScanSettings={...defaults(powerSweep),yMode:'max',projectionXMin:3001,projectionXMax:3002};
delete legacyScanSettings.scanStatistic;delete legacyScanSettings.scanStatisticMin;delete legacyScanSettings.scanStatisticMax;
const migratedScan=scanCorrelationData(powerSweep,legacyScanSettings);
assert.equal(migratedScan.valid,true);
assert.equal(legacyScanSettings.scanStatistic,'max');
assert.equal(legacyScanSettings.scanStatisticMin,3001);
assert.equal(legacyScanSettings.scanStatisticMax,3002);
assert.deepEqual(migratedScan.y,[3,6,12]);
const legacyNullRange={...defaults(powerSweep),yMode:'rms',projectionXMin:null,projectionXMax:null};
delete legacyNullRange.scanStatistic;delete legacyNullRange.scanStatisticMin;delete legacyNullRange.scanStatisticMax;
const migratedNullRange=scanCorrelationData(powerSweep,legacyNullRange);
assert.equal(migratedNullRange.valid,true);
assert.equal(legacyNullRange.scanStatisticMin,3000);
assert.equal(legacyNullRange.scanStatisticMax,3002);
const zeroTenTwentySettings={...defaults(powerSweep),scanAxisMode:'power',scanPowerReferenceMW:200};
const zeroTenTwenty=scanCorrelationData(powerSweep,zeroTenTwentySettings);
assert.equal(zeroTenTwenty.valid,true);
assert(Math.abs(zeroTenTwenty.x[0]-2)<1e-12);
assert(Math.abs(zeroTenTwenty.x[1]-200*10**(-2.1))<1e-12);
assert(Math.abs(zeroTenTwenty.x[2]-200*10**(-2.2))<1e-12);
powerSettings.scanPowerReferenceMW='';
assert.equal(scanCorrelationData(powerSweep,powerSettings).valid,false);
const nonPowerSweep={...powerSweep,y:{name:'Time',unit:'ms',values:[0,1,2]}};
powerSettings.scanPowerReferenceMW=1;
assert.equal(scanCorrelationData(nonPowerSweep,powerSettings).valid,false);
const overlapSettings=defaults(powerSweep);overlapSettings.step=1;const overlay=overlapData(powerSweep,overlapSettings);assert.equal(overlay.valid,true);assert.deepEqual(overlay.xAxis,{name:'Field',unit:'G'});assert.deepEqual(overlay.scanAxis,{name:'Microwave attenuation',unit:'dB'});assert.equal(overlay.traces.length,3);assert.deepEqual(overlay.traces[1].x,[3000,3001,3002]);assert.deepEqual(overlay.traces[1].y,[2,4,6]);overlapSettings.step=2;assert.equal(overlapData(powerSweep,overlapSettings).traces.length,2);
console.log('Scan-correlation statistics, zero-dB power reference, legacy project migration and attenuation-to-mW conversion passed');
