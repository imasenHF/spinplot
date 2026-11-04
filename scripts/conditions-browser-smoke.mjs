import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const browser = await chromium.launch({headless:true,...(process.env.SPINPLOT_CHROMIUM_PATH ? {executablePath:process.env.SPINPLOT_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']} : {})});
fs.mkdirSync('browser-preview',{recursive:true});
try {
  const page = await browser.newPage({viewport:{width:1600,height:1000},acceptDownloads:true});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.SPINPLOT_TEST_URL,{waitUntil:'networkidle'});
  const B=Array.from({length:121},(_,i)=>3340+i*0.2);
  const attenuation=Array.from({length:13},(_,i)=>i*3);
  const real=attenuation.map(a=>B.map(field=>{const x=(field-3352)/2;return x*Math.exp(-x*x/2)*Math.sqrt(100*10**(-a/10));}));
  const metadata={setting:{microwavePower:'2 mW',modulationAmplitude:'1 G',modulationFrequency:'100 kHz',timeConstant:'20 ms',conversionTime:'10 ms',sweepTime:'60 s',accumulations:4}};
  const matrix={name:'Field-power',x:{name:'Field',unit:'G',values:B},y:{name:'Microwave attenuation',unit:'dB',values:attenuation},real,imag:real.map(row=>row.map(()=>0)),metadata:{...metadata,frequencies:attenuation.map(()=>9.85)}};
  const base={collapsed:false,curves:[],mode:'overlay',gridRow:1,rowSpan:1,colSpan:1,gUseGlobal:false,gShow:false,xUseGlobal:false,yUseGlobal:false};
  const fixture={type:'SpinPlotProject',version:11,appVersion:'0.11.4',rawCurves:[
    {name:'Reference 1',B,y:real[0],freq:9.84,metadata},
    {name:'Reference 2',B,y:real[1],freq:9.86,metadata},
    {name:'Field-power',B,y:real[0],freq:9.85,matrix},
  ],config:{version:10,controls:{canvasPreset:'custom',canvasWidth:'1500',canvasHeight:'800',baselineMode:'none',globalFreqMode:'local_mean',showGAxis:false},
    layout:{rows:1,cols:3,spans:'1,1,1',gapX:12,gapY:20},subplots:[
      {...base,title:'CW comparison',curves:[0,1],gridCol:1},
      {...base,title:'Heatmap',mode:'heatmap',gridCol:2,twoD:{index:2,settings:{swap:false,showScanCorrelation:false,showXProjection:true,showYProjection:false}}},
      {...base,title:'Variable scan',mode:'scan',gridCol:3,twoD:{index:2,settings:{swap:false,scanAxisMode:'power',scanPowerReferenceMW:100,scanFeatureMode:'amplitude',scanStatisticMin:3340,scanStatisticMax:3364,scanFitAmplitude:true}}},
    ]}};
  const load=async data=>{
    await page.locator('#projectFile').setInputFiles({name:'conditions.spinplot.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
    await page.waitForTimeout(300);await page.locator('[data-tab="subplots"]').click();
    assert.equal(await page.locator('.subplot').count(),3);
  };
  const download=async(button,path)=>{const[d]=await Promise.all([page.waitForEvent('download'),button.click()]);await d.saveAs(path);return fs.readFileSync(path);};
  const save=async path=>JSON.parse(await download(page.locator('#saveProjectBtn'),path));
  await load(fixture);
  const card=page.locator('.subplot').first(), box=card.locator('.experimental-conditions');
  assert.equal(await box.locator('[data-condition="enabled"]').isChecked(),false,'Old projects keep condition labels hidden');
  assert.deepEqual(await box.locator('.condition-group legend').allTextContents(),['Sample','Microwave','Modulation','Acquisition']);
  assert.equal(await box.locator('[data-condition-show]').count(),12);
  await card.locator('[data-annotation-details]').evaluate(el=>{el.open=true;});
  await box.evaluate(el=>{el.open=true;});
  await page.evaluate(()=>{
    const proto=CanvasRenderingContext2D.prototype,clear=proto.clearRect,fill=proto.fillText;
    window.__conditionCalls=[];
    proto.clearRect=function(...args){if(this.canvas.id==='plotCanvas')window.__conditionCalls=[];return clear.apply(this,args);};
    proto.fillText=function(text,x,y,...rest){
      if(this.canvas.id==='plotCanvas'&&/^(Sample =|νacq =|Mod\. amp\. =|TC =)/.test(String(text))){const t=this.getTransform();window.__conditionCalls.push({text:String(text),x:t.a*x+t.c*y+t.e,y:t.b*x+t.d*y+t.f});}
      return fill.call(this,text,x,y,...rest);
    };
  });
  await box.locator('[data-condition="enabled"]').check();
  for(const checkbox of await box.locator('[data-condition-show]').all())await checkbox.check();
  for(const [key,value] of [['sampleName','Specimen A'],['sampleId','S-01'],['description','Grouped <demo>']]){
    const input=box.locator('[data-condition-value="'+key+'"]');await input.fill(value);await input.press('Tab');
  }
  assert.equal(await box.locator('[data-condition-value="modAmplitude"]').inputValue(),'0.1');
  assert.equal(await box.locator('[data-condition-unit="modAmplitude"]').inputValue(),'mT');
  const power=box.locator('[data-condition-value="power"]');await power.fill('5');await power.press('Tab');
  assert.equal(await power.getAttribute('data-source'),'manual');
  await box.getByRole('button',{name:'Restore MW power from file',exact:true}).click();
  assert.equal(await power.inputValue(),'2');assert.equal(await power.getAttribute('data-source'),'file');
  await page.waitForTimeout(180);
  const calls=await page.evaluate(()=>window.__conditionCalls);
  assert.equal(calls.length,4,'Four approved groups produce exactly four figure rows');
  assert.ok(calls.every((call,i)=>!i||call.y>calls[i-1].y));
  assert.match(calls[0].text,/Specimen A.*S-01.*Grouped <demo>/);
  assert.match(calls[1].text,/9.84–9.86 GHz.*νref = 9.85 GHz.*P = 2 mW/);
  assert.match(calls[2].text,/Mod\. amp\. = 0.1 mT.*Mod\. freq\. = 100 kHz/);
  assert.match(calls[3].text,/TC = 20 ms.*Point time = 10 ms.*Sweep time = 60 s.*Scans = 4/);
  for(const key of ['timeConstant','pointTime','sweepTime','scans'])await box.locator('[data-condition-show="'+key+'"]').uncheck();
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>window.__conditionCalls.length),3,'An empty acquisition group leaves no blank row');
  for(const key of ['timeConstant','pointTime','sweepTime','scans'])await box.locator('[data-condition-show="'+key+'"]').check();
  await box.locator('[data-condition="position"]').selectOption('lower_left');
  const project=await save('browser-preview/experimental-conditions.json');
  assert.equal(project.version,11);assert.equal(project.config.version,10);
  assert.equal(project.config.subplots[0].experimentalConditions.fields.sampleName.value,'Specimen A');
  assert.equal(project.config.subplots[1].experimentalConditions.enabled,false,'Conditions are local to each subplot');
  assert.deepEqual(project.rawCurves[0].metadata,metadata,'Manual edits preserve acquisition metadata');
  await load(project);
  assert.equal(await box.locator('[data-condition="enabled"]').isChecked(),true);
  assert.equal(await box.locator('[data-condition-value="sampleName"]').inputValue(),'Specimen A');
  assert.equal(await box.locator('[data-condition="position"]').inputValue(),'lower_left');
  // Apply the same four-row display to Heatmap and Variable scan, using their own file values.
  for(const index of [1,2]){
    const other=page.locator('.subplot').nth(index);await other.locator('[data-annotation-details]').evaluate(el=>{el.open=true;});
    const conditions=other.locator('.experimental-conditions');await conditions.evaluate(el=>{el.open=true;});
    await conditions.locator('[data-condition="enabled"]').check();
    await conditions.locator('[data-condition-show="attenuation"]').check();
    await conditions.locator('[data-condition="position"]').selectOption('lower_left');
  }
  const heatmapBox=page.locator('.subplot').nth(1).locator('.experimental-conditions');
  assert.equal(await heatmapBox.locator('[data-condition-value="attenuation"]').inputValue(),'0–36');
  const scanBox=page.locator('.subplot').nth(2).locator('.experimental-conditions');
  assert.match(await scanBox.locator('[data-condition-value="power"]').inputValue(),/–100$/,'A power scan displays its calibrated range');
  await page.locator('[data-tab="export"]').click();
  await download(page.locator('#saveConfigBtnSide'),'browser-preview/experimental-conditions-config.json');
  const exportImage=async format=>{await page.locator('#imageFormat').selectOption(format);return download(page.locator('#exportImageBtnSide'),'browser-preview/experimental-conditions.'+format);};
  const svg=(await exportImage('svg')).toString();
  assert.match(svg,/Sample = Specimen A.*Grouped &lt;demo&gt;/);
  assert.match(svg,/Atten\. = 0–36 dB/);assert.match(svg,/P₀ = 100 mW/);
  assert.doesNotMatch(svg,/NaN|Infinity/);
  assert.equal((await exportImage('pdf')).subarray(0,5).toString(),'%PDF-');
  assert.deepEqual([...((await exportImage('png')).subarray(0,8))],[137,80,78,71,13,10,26,10]);
  const config=fs.readFileSync('browser-preview/experimental-conditions-config.json');
  await page.locator('#configFileSide').setInputFiles({name:'conditions-config.json',mimeType:'application/json',buffer:config});
  await page.waitForTimeout(220);await page.locator('[data-tab="subplots"]').click();
  assert.equal(await box.locator('[data-condition-value="sampleName"]').inputValue(),'Specimen A');
  await box.scrollIntoViewIfNeeded();await page.screenshot({path:'browser-preview/experimental-conditions.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('BROWSER PASS: four grouped condition rows, metadata/overrides, local settings, scan ranges, project/config persistence and SVG/PDF');
} finally { await browser.close(); }
