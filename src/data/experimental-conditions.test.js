import test from 'node:test';
import assert from 'node:assert/strict';
import { CONDITION_FIELDS, CONDITION_GROUPS, normalizeConditions, extractConditions, conditionRows } from './experimental-conditions.js';
import { conditionBoxLayout, drawConditions } from '../plotting/experimental-conditions.js';

const selected = fields => ({ enabled:true, fields:Object.fromEntries(Object.keys(CONDITION_FIELDS).map(key => [key,
  {show:Object.hasOwn(fields,key),manual:true,value:fields[key] || '',unit:CONDITION_FIELDS[key].unit}])) });
test('only the four approved groups are selectable; legacy files stay hidden', () => {
  assert.deepEqual(CONDITION_GROUPS.map(group=>group.key),['sample','microwave','modulation','acquisition']);
  assert.equal(Object.keys(CONDITION_FIELDS).length,12);
  assert.equal(normalizeConditions().enabled,false);
  assert.deepEqual(conditionRows(undefined,extractConditions()),[]);
});
test('each nonempty group occupies one row; empty groups and unchecked fields leave no blanks', () => {
  const input=selected({sampleName:'A',sampleId:'S1',frequency:'9.85',power:'0',modAmplitude:'0.1',modFrequency:'100',timeConstant:'20',pointTime:'10',sweepTime:'60',scans:'4'});
  const rows=conditionRows(input,{});
  assert.deepEqual(rows.map(row=>row.group),['sample','microwave','modulation','acquisition']);
  assert.match(rows[0].text,/Sample = A.*ID = S1/);
  assert.match(rows[1].text,/νacq = 9.85 GHz.*P = 0 mW/);
  assert.match(rows[2].text,/Mod\. amp\. = 0.1 mT.*Mod\. freq\. = 100 kHz/);
  assert.match(rows[3].text,/TC = 20 ms.*Point time = 10 ms.*Sweep time = 60 s.*Scans = 4/);
  input.fields.power.show=false;input.fields.frequency.value='';
  assert.deepEqual(conditionRows(input,{}).map(row=>row.group),['sample','modulation','acquisition']);
});
test('file values require explicit units and keep time constant and point time separate', () => {
  const curve={freq:9.85,metadata:{setting:{microwavePower:2,modulationAmplitude:'1 G',modulationFrequency:{value:100000,unit:'Hz'},timeConstant:'20 ms',conversionTime:'0.01 s',accumulations:4}}};
  const before=JSON.stringify(curve), context=extractConditions({curves:[curve]});
  assert.equal(context.values.power,null,'A unitless vendor power value must not be labeled mW');
  assert.deepEqual(context.values.modAmplitude,{value:'0.1',unit:'mT'});
  assert.deepEqual(context.values.modFrequency,{value:'100',unit:'kHz'});
  assert.equal(context.values.timeConstant.value,'20');assert.equal(context.values.pointTime.value,'10');
  const input=selected({frequency:'9.4'});
  assert.match(conditionRows(input,context)[0].text,/9.4 GHz/);
  input.fields.frequency.manual=false;
  assert.match(conditionRows(input,context)[0].text,/9.85 GHz/);
  assert.equal(JSON.stringify(curve),before,'Display overrides preserve the file metadata');
});
test('multiple curves report frequency ranges and an explicit alignment reference', () => {
  const context=extractConditions({curves:[{freq:9.84},{freq:9.86}],referenceFrequency:9.85});
  const input=normalizeConditions({enabled:true});
  assert.match(conditionRows(input,context)[0].text,/νacq = 9.84–9.86 GHz.*νref = 9.85 GHz/);
  assert.match(extractConditions({curves:[{freq:9.85},{}]}).values.frequency.value,/incomplete/);
});
test('a power scan reports acquired ranges with calibration rather than the first trace value', () => {
  const matrix={x:{name:'Field',unit:'G',values:[3300,3400]},y:{name:'Microwave attenuation',unit:'dB',values:[0,10,20]},metadata:{frequencies:[9.85,9.85,9.85],setting:{microwavePower:'2 mW'}}};
  const context=extractConditions({matrix,settings:{scanAxisMode:'power',scanPowerReferenceMW:100}});
  assert.deepEqual(context.values.attenuation,{value:'0–20',unit:'dB'});
  assert.deepEqual(context.values.power,{value:'1–100',unit:'mW',note:'P₀ = 100 mW'});
  assert.equal(extractConditions({matrix}).values.power,null);
});
test('all positions keep the complete grouped block inside a narrow plot', () => {
  const rows=conditionRows(selected({sampleName:'A very long sample description',frequency:'9.85',modFrequency:'100',scans:'4'}),{});
  const geom={x0:100,y0:50,pw:160,ph:60};
  for(const position of ['upper_left','upper_right','center','lower_left','lower_right','custom']){
    const box=conditionBoxLayout(rows,{enabled:true,position,x:100,y:100},geom,text=>text.length*7);
    assert.ok(box.left>=106&&box.top>=54);
    assert.ok(box.left+box.width<=254.000001&&box.top+box.height<=106.000001);
  }
  const calls=[];
  const ctx=new Proxy({measureText:text=>({width:text.length*7}),fillText:(...args)=>calls.push(args)}, {get:(object,key)=>key in object?object[key]:()=>{}});
  drawConditions(ctx,rows,{enabled:true},geom,'Arial',{text:'#000',axis:'#000',bg:'#fff'});
  assert.equal(calls.length,4,'One drawing call per selected group');
  assert.ok(calls.every((call,i)=>!i||call[2]>calls[i-1][2]));
});
