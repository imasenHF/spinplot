import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,parseProjectCurves,readProjectCurves,validateProjectCurves,validateProjectConfig} from './project.js';
const one=()=>({name:'Synthetic EPR',B:[3300,3310,3320],y:[1,null,-1],freq:9.85,source:'synthetic.csv'});
test('project serialization retains exact format and config version',()=>{
 const config={version:10,subplots:[{curves:[0]}]};
 const p=createProject({appVersion:'0.9.2',sourceType:'CSV',sourceName:'synthetic.csv',rawCurves:[one()],config,created:'2026-10-09T00:00:00.000Z'});
 assert.deepEqual(Object.keys(p),['type','version','appVersion','created','sourceType','sourceName','rawCurves','config']);
 assert.equal(p.version,11); assert.equal(p.config.version,10); assert.equal(p.appVersion,'0.9.2');
 assert.deepEqual(p.rawCurves[0].y,[1,null,-1]);
});
test('legacy project 9, 10, and 11 load without changing source coordinates',()=>{
 for(const version of [9,10,11]){
  const obj={type:'SpinPlotProject',version,rawCurves:[one()],config:{version:10,subplots:[{curves:[0]}]}};
  const parsed=parseProjectCurves(obj);
  assert.deepEqual(parsed[0].B,[3300,3310,3320]);
  assert.deepEqual(parsed[0].y.filter(Number.isFinite),[1,-1]);
  assert.ok(Number.isNaN(parsed[0].y[1]));
 }
});
test('old EPRPlotProject and aligned project branches are retained',()=>{
 const old={type:'EPRPlotProject',rawEpr:[{source:'old.epr',B:[1,2],y:[3,4],freq:9.5}]};
 assert.equal(parseProjectCurves(old)[0].name,'old.epr');
 assert.deepEqual(parseProjectCurves({aligned:{B:[1,2],curves:[{name:'legacy',y:[5,6],freq:9.5}]}})[0].B,[1,2]);
});
test('invalid versions, axes and frequencies are rejected',()=>{
 for(const version of [8,12,null])assert.throws(()=>readProjectCurves({type:'SpinPlotProject',version,rawCurves:[one()]}),/Unsupported SpinPlot/);
 assert.throws(()=>validateProjectCurves([{...one(),B:[1,1,2]}]),/strictly monotonic/);
 assert.throws(()=>validateProjectCurves([{...one(),B:[1,3,2]}]),/strictly monotonic/);
 assert.throws(()=>validateProjectCurves([{...one(),freq:0}]),/invalid frequency/);
 assert.throws(()=>validateProjectCurves([{...one(),y:[1]}]),/lengths differ/);
});
test('config format and references remain checked',()=>{
 assert.throws(()=>validateProjectConfig({version:11,subplots:[]},1),/Unsupported config/);
 assert.throws(()=>validateProjectConfig({version:10,subplots:[{curves:[1]}]},1),/invalid curve index/);
 assert.throws(()=>validateProjectConfig({version:10,subplots:[{curves:[],twoD:{index:0,settings:null}}]},1),/Invalid 2D subplot reference/);
 assert.throws(()=>parseProjectCurves({type:'SpinPlotProject',version:11,rawCurves:[one()],config:{version:10,subplots:[{curves:[],twoD:{index:0,settings:{mode:'heatmap'}}}]}}),/non-matrix/);
});
test('valid 2D matrix references are restored and retained',()=>{
 const d={name:'2D',x:{name:'Field',unit:'G',values:[3300,3310]},y:{name:'Time',unit:'ns',values:[0,1]},real:[[1,2],[3,4]],imag:[[0,0],[0,0]]};
 const c={...one(),matrix:d};
 const obj={type:'SpinPlotProject',version:11,rawCurves:[c],config:{version:10,subplots:[{curves:[],twoD:{index:0,settings:{mode:'heatmap'}}}]}};
 assert.equal(parseProjectCurves(obj)[0].matrix.real[1][1],4);
});
