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
 await run('node',['scripts/preview-browser-smoke.mjs'],{env:{...process.env,SPINPLOT_TEST_URL:'http://127.0.0.1:4173/spinplot/',SPINPLOT_TEST_COLORBAR_DBLCLICK:'1',SPINPLOT_TEST_FREQUENCY_ALIGNMENT:'1',SPINPLOT_TEST_SCAN_CORRELATION:'1'}});
 const compared=[];
 for(const name of fs.readdirSync('browser-baseline').filter(n=>/\.(csv|json|svg)$/.test(n)&&n!=='result.json')){
  let old=fs.readFileSync('browser-baseline/'+name,'utf8'),current=fs.readFileSync('browser-preview/'+name,'utf8');
  if(name.endsWith('.json')){old=JSON.parse(old);current=JSON.parse(current);delete old.created;delete current.created;for(const payload of [old,current]){for(const sp of payload.config?.subplots??[]){delete sp.freqOverrideExplicit;delete sp.uiOpen;for(const key of ['showScanCorrelation','scanAxisMode','scanPowerReferenceMW','scanPowerReferenceAttenuationDB'])delete sp.twoD?.settings?.[key];}for(const sp of payload.subplots??[]){delete sp.freqOverrideExplicit;delete sp.uiOpen;for(const key of ['showScanCorrelation','scanAxisMode','scanPowerReferenceMW','scanPowerReferenceAttenuationDB'])delete sp.twoD?.settings?.[key];}}assert.deepEqual(current,old,name+' reference equality');}
  else assert.equal(current,old,name+' reference equality');compared.push(name);
 }
 // Chromium PNG encoder output must remain identical at the same dimensions/DPI.
 assert.deepEqual(fs.readFileSync('browser-preview/figure.png'),fs.readFileSync('browser-baseline/figure.png'),'PNG reference equality');compared.push('figure.png');
 fs.writeFileSync('browser-preview/comparison.json',JSON.stringify({reference:'911a6a8',passed:true,compared},null,2));
 console.log('REFERENCE COMPARISON PASS: '+compared.length+' files');
}finally{for(const p of servers)try{process.kill(-p.pid,'SIGTERM');}catch{}}
