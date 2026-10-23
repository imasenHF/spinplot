import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const run=(cmd,args,options={})=>new Promise((resolve,reject)=>{const p=spawn(cmd,args,{stdio:'inherit',...options});p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(Error(`${cmd} exited ${code}`)));});
const servers=[];
try{
 for(const [port,cwd] of [[4174,'../spinplot-baseline'],[4173,'.']]){
  const p=spawn('npm',['run','preview','--','--host','127.0.0.1','--port',String(port)],{cwd,stdio:'inherit',detached:true});servers.push(p);
  let ready=false;for(let i=0;i<100;i++){try{ready=(await fetch(`http://127.0.0.1:${port}/spinplot/`)).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,200));}assert.ok(ready,'Preview server started');
 }
 fs.rmSync('browser-preview',{recursive:true,force:true});fs.rmSync('browser-baseline',{recursive:true,force:true});
 await run('node',['scripts/preview-browser-smoke.mjs'],{env:{...process.env,SPINPLOT_TEST_URL:'http://127.0.0.1:4174/spinplot/'}});
 fs.renameSync('browser-preview','browser-baseline');
 await run('node',['scripts/preview-browser-smoke.mjs'],{env:{...process.env,SPINPLOT_TEST_URL:'http://127.0.0.1:4173/spinplot/',SPINPLOT_TEST_COLORBAR_DBLCLICK:'1',SPINPLOT_TEST_FREQUENCY_ALIGNMENT:'1',SPINPLOT_TEST_TWOD_VIEW_MODES:'1',SPINPLOT_TEST_MANUAL_CURVE_HEATMAP:'1'}});
 const compared=[];
 for(const name of fs.readdirSync('browser-baseline').filter(n=>/\.(csv|json)$/.test(n)&&n!=='result.json')){
  let old=fs.readFileSync('browser-baseline/'+name,'utf8'),current=fs.readFileSync('browser-preview/'+name,'utf8');
  if(name.endsWith('.json')){old=JSON.parse(old);current=JSON.parse(current);delete old.created;delete current.created;for(const payload of [old,current]){for(const sp of payload.config?.subplots??[]){delete sp.freqOverrideExplicit;delete sp.uiOpen;for(const key of ['showScanCorrelation','scanAxisMode','scanPowerReferenceMW','scanPowerReferenceAttenuationDB','scanStatistic','scanStatisticMin','scanStatisticMax'])delete sp.twoD?.settings?.[key];}for(const sp of payload.subplots??[]){delete sp.freqOverrideExplicit;delete sp.uiOpen;for(const key of ['showScanCorrelation','scanAxisMode','scanPowerReferenceMW','scanPowerReferenceAttenuationDB','scanStatistic','scanStatisticMin','scanStatisticMax'])delete sp.twoD?.settings?.[key];}}assert.deepEqual(current,old,name+' reference equality');}
  else assert.equal(current,old,name+' reference equality');compared.push(name);
 }
 // Visual exports intentionally change for title wrapping, title-free Variable scan and continuous-palette single-curve colors; validate their structure instead of byte-comparing against the old appearance.
 const visualFiles=fs.readdirSync('browser-preview').filter(n=>/\.(svg|png)$/.test(n));
 for(const name of visualFiles){if(name.endsWith('.svg')){const svg=fs.readFileSync('browser-preview/'+name,'utf8');assert.match(svg,/<svg\b/,name+' must be valid SVG markup');assert.doesNotMatch(svg,/\b(?:NaN|Infinity)\b/,name+' must not contain invalid numeric coordinates');}else assert(fs.statSync('browser-preview/'+name).size>0,name+' must be non-empty');}
 fs.writeFileSync('browser-preview/comparison.json',JSON.stringify({reference:'911a6a8',passed:true,compared,visualFiles,visualComparison:'structural-only; appearance intentionally changed'},null,2));
 console.log('REFERENCE COMPARISON PASS: '+compared.length+' data files; '+visualFiles.length+' visual exports structurally validated');
}finally{for(const p of servers)try{process.kill(-p.pid,'SIGTERM');}catch{}}
