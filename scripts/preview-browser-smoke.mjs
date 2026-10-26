import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';

const url = process.env.SPINPLOT_TEST_URL || 'https://plastocyanin.org/previews/spinplot-modularization/';
fs.mkdirSync('browser-preview', {recursive: true});
const browser = await chromium.launch({headless:true,...(process.env.SPINPLOT_CHROMIUM_PATH?{executablePath:process.env.SPINPLOT_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']}: {})});
const errors=[];
try {
  const page = await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
  page.on('pageerror', err => errors.push(err.message));
  const response = await page.goto(url,{waitUntil:'networkidle',timeout:45000});
  assert.equal(response.status(),200,'Preview HTML must be served');
  assert.match(await page.title(),/SpinPlot 0\.9\.2/);
  assert.equal(await page.locator('.tab-btn').count(),6,'Six tabs are required');
  await page.waitForFunction(() => document.querySelector('#statusMain')?.textContent?.includes('Waiting for data'),null,{timeout:15000});
  await page.locator('#dataFiles').setInputFiles({name:'synthetic-cw.csv',mimeType:'text/csv',
    buffer:Buffer.from('B,Trace A,Trace B\n3300,0,0\n3310,1,2\n3320,-1,-2\n3330,0,0\n3340,1,2\n3350,0,0\n')});
  await page.waitForFunction(() => document.querySelector('#dataCount')?.textContent?.trim()==='2',null,{timeout:20000});
  await page.screenshot({path:'browser-preview/spinplot-wide.png',fullPage:true});
  await page.locator('button.tab-btn[data-tab="scaling"]').click();
  assert.match(await page.locator('button.tab-btn[data-tab="scaling"]').getAttribute('class'),/active/);
  await page.locator('button.tab-btn[data-tab="export"]').click();
  const [download] = await Promise.all([page.waitForEvent('download',{timeout:15000}),page.locator('#exportCsvBtn').click()]);
  assert.match(download.suggestedFilename(),/\.csv$/i);
  await download.saveAs('browser-preview/synthetic-global.csv');
  const exportDisplay=async (path)=>{
    await page.locator('button.tab-btn[data-tab="export"]').click();
    const [d] = await Promise.all([
      page.waitForEvent('download',{timeout:15000}),
      page.locator('#exportDisplayCsvBtn').click()
    ]);
    await d.saveAs(path);
    const [header,...rows]=fs.readFileSync(path,'utf8').trim().split(/\r?\n/).map(line=>line.split(','));
    return {header,rows};
  };
  const coordinateFor=(data,curve)=>{
    const i=data.header.indexOf('curve_index'),j=data.header.indexOf('coordinate');
    assert.ok(i>=0&&j>=0,'Display CSV must contain curve index and coordinate');
    const row=data.rows.find(r=>Number(r[i])===curve);
    assert.ok(row,'Expected synthetic curve in display CSV');
    return Number(row[j]);
  };
  const valueFor=(data,curve,field)=>{
    const i=data.header.indexOf('curve_index'),j=data.header.indexOf('coordinate'),k=data.header.indexOf('Y_display');
    assert.ok(i>=0&&j>=0&&k>=0,'Display CSV must contain coordinate, curve index and intensity');
    const row=data.rows.find(r=>Number(r[i])===curve&&Number(r[j])===field);
    assert.ok(row,'Expected synthetic curve/sample point in display CSV');
    return Number(row[k]);
  };

  // The new frequency-alignment behavior is tested only against the current modularized build.
  // The pre-migration reference does not contain these controls and remains an A/B baseline.
  if (process.env.SPINPLOT_TEST_FREQUENCY_ALIGNMENT === '1') {
    await page.locator('button.tab-btn[data-tab="data"]').click();
    assert.equal(await page.locator('#globalFreqMode').inputValue(),'local_mean','Global frequency mode defaults to Local mean');
    assert.equal(await page.locator('.subplot').first().locator('[data-field="freqMode"]').inputValue(),'local','New subplots default to local alignment');
    assert.equal(await page.locator('.subplot').first().locator('[data-field="localFreqMode"]').inputValue(),'mean','New subplots default to Local mean');
    await page.locator('#freqTable [data-source-frequency="0"]').fill('9.5');
    await page.locator('#freqTable [data-source-frequency="0"]').press('Tab');
    assert.equal(Number(await page.locator('#freqTable [data-source-frequency="0"]').inputValue()),9.5,'Source frequency entry for first CSV curve must persist');
    await page.locator('#freqTable [data-source-frequency="1"]').fill('9.7');
    await page.locator('#freqTable [data-source-frequency="1"]').press('Tab');
    assert.equal(Number(await page.locator('#freqTable [data-source-frequency="1"]').inputValue()),9.7,'Source frequency entry for second CSV curve must persist');
    await page.locator('button.tab-btn[data-tab="scaling"]').click();
    await page.locator('#baselineMode').selectOption('none');
    const localMeanCSV=await exportDisplay('browser-preview/frequency-local-mean.csv');
    assert.ok(Math.abs(coordinateFor(localMeanCSV,0)-3300*9.6/9.5)<1e-7,'Default Local mean must align both curves to 9.6 GHz');
    assert.ok(Math.abs(coordinateFor(localMeanCSV,1)-3300*9.6/9.7)<1e-7,'Default Local mean must use each source frequency');

    await page.locator('button.tab-btn[data-tab="subplots"]').click();
    await page.locator('#groupExpression').fill('0 / 1');
    await page.locator('#applyGroupsBtn').click();
    const localGroupsCSV=await exportDisplay('browser-preview/frequency-local-groups.csv');
    assert.equal(coordinateFor(localGroupsCSV,0),3300,'Local mean aligns a single-curve subplot to its own source frequency');
    assert.equal(coordinateFor(localGroupsCSV,1),3300,'Local mean is calculated independently for each subplot');

    await page.locator('button.tab-btn[data-tab="data"]').click();
    await page.locator('#globalFreqMode').selectOption('global_mean');
    const globalMeanCSV=await exportDisplay('browser-preview/frequency-global-mean.csv');
    assert.ok(Math.abs(coordinateFor(globalMeanCSV,0)-3300*9.6/9.5)<1e-7,'Global mean must use the mean frequency across all curves');
    assert.ok(Math.abs(coordinateFor(globalMeanCSV,1)-3300*9.6/9.7)<1e-7,'Global mean target must apply to each subplot');

    await page.locator('button.tab-btn[data-tab="data"]').click();
    await page.locator('#globalFreqMode').selectOption('manual');
    await page.locator('#targetFreq').fill('10');
    const globalTargetCSV=await exportDisplay('browser-preview/frequency-global-target.csv');
    assert.ok(Math.abs(coordinateFor(globalTargetCSV,0)-3300*10/9.5)<1e-7,'Global Manual target must affect untouched subplots');
    assert.ok(Math.abs(coordinateFor(globalTargetCSV,1)-3300*10/9.7)<1e-7,'Global Manual target must scale every curve from its own source frequency');

    const openFrequencySettings=async()=>{
      const card=page.locator('.subplot').first();
      if(await card.evaluate(el=>el.classList.contains('collapsed')))await card.locator('[data-action="collapse"]').click();
      const processing=card.locator('details[data-section="processing"]');
      if(!await processing.evaluate(el=>el.open))await processing.locator('summary').first().click();
      const details=processing.locator('details.advanced-layout').filter({hasText:'Frequency alignment / g frequency'});
      if(!await details.evaluate(el=>el.open))await details.locator('summary').click();
    };
    await page.locator('button.tab-btn[data-tab="subplots"]').click();
    await page.locator('#groupExpression').fill('0,1');
    await page.locator('#applyGroupsBtn').click();
    await openFrequencySettings();
    await page.locator('.subplot').first().locator('[data-field="freqMode"]').selectOption('local');
    await openFrequencySettings();
    await page.locator('.subplot').first().locator('[data-field="localFreqMode"]').selectOption('manual');
    await openFrequencySettings();
    await page.locator('.subplot').first().locator('[data-field="localFreqTarget"]').fill('9.8');
    const localTargetCSV=await exportDisplay('browser-preview/frequency-local-target.csv');
    assert.ok(Math.abs(coordinateFor(localTargetCSV,0)-3300*9.8/9.5)<1e-7,'Local Manual target must override the global target');
    assert.ok(Math.abs(coordinateFor(localTargetCSV,1)-3300*9.8/9.7)<1e-7,'Local Manual target must apply to every curve in the subplot');

    // Restore the baseline fixture with missing source frequency metadata.
    await page.locator('button.tab-btn[data-tab="data"]').click();
    await page.locator('#targetFreq').fill('9.85');
    await page.locator('#clearDataBtn').click();
    await page.locator('#dataFiles').setInputFiles({name:'synthetic-cw.csv',mimeType:'text/csv',buffer:Buffer.from('B,Trace A,Trace B\n3300,0,0\n3310,1,2\n3320,-1,-2\n3330,0,0\n3340,1,2\n3350,0,0\n')});
    await page.waitForFunction(() => document.querySelector('#dataCount')?.textContent?.trim()==='2',null,{timeout:20000});
    await page.locator('button.tab-btn[data-tab="subplots"]').click();
    await openFrequencySettings();
    await page.locator('.subplot').first().locator('[data-field="freqMode"]').selectOption('local');
    await openFrequencySettings();
    await page.locator('.subplot').first().locator('[data-field="localFreqMode"]').selectOption('mean');
  }
  await page.locator('button.tab-btn[data-tab="scaling"]').click();
  await page.locator('#baselineMode').selectOption('region');
  await page.locator('#baselineRegions').fill('3300-3310');
  const baselineCSV=await exportDisplay('browser-preview/region-baseline.csv');
  assert.ok(Math.abs(valueFor(baselineCSV,0,3300)+0.5)<1e-10,'Regional baseline subtraction for first trace');
  assert.ok(Math.abs(valueFor(baselineCSV,1,3300)+1)<1e-10,'Regional baseline subtraction for second trace');

  // Project and config persistence: verify format numbers and legacy project reload.
  const [projectDownload] = await Promise.all([page.waitForEvent('download',{timeout:15000}),page.locator('#saveProjectBtn').click()]);
  const projectPath='browser-preview/synthetic-project.spinplot.json';
  await projectDownload.saveAs(projectPath);
  const project=JSON.parse(fs.readFileSync(projectPath,'utf8'));
  assert.equal(project.type,'SpinPlotProject');
  assert.equal(project.version,11);
  assert.equal(project.config.version,10);
  assert.equal(project.rawCurves.length,2);
  const [configDownload] = await Promise.all([page.waitForEvent('download',{timeout:15000}),page.locator('#saveConfigBtn').click()]);
  const configPath='browser-preview/synthetic-config.json';
  await configDownload.saveAs(configPath);
  const config=JSON.parse(fs.readFileSync(configPath,'utf8'));
  assert.equal(config.version,10);
  assert.ok(!Object.hasOwn(config,'rawCurves'));
  for (const version of [9,10,11]) {
    const fileName='synthetic-v'+version+'.spinplot.json';
    await page.locator('#projectFile').setInputFiles({name:fileName,mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...project,version}))});
    await page.waitForFunction((name)=>document.querySelector('#log')?.textContent?.includes('Project loaded: '+name),fileName,{timeout:15000});
    assert.equal((await page.locator('#dataCount').textContent()).trim(),'2');
  }
  const stacked={...project,config:{...project.config,subplots:project.config.subplots.map((sp,i)=>i===0?{...sp,mode:'stack',offsetMode:'manual',manualOffsets:'0, 3',offsetDirection:1}:sp)}};
  const stackName='synthetic-stack.spinplot.json';
  await page.locator('#projectFile').setInputFiles({name:stackName,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(stacked))});
  await page.waitForFunction((name)=>document.querySelector('#log')?.textContent?.includes('Project loaded: '+name),stackName,{timeout:15000});
  const stackCSV=await exportDisplay('browser-preview/stack-display.csv');
  assert.ok(Math.abs(valueFor(stackCSV,0,3300)+0.5)<1e-10,'Stack does not affect first trace');
  assert.ok(Math.abs(valueFor(stackCSV,1,3300)-2)<1e-10,'Manual stack offset is display-only and applied to second trace');
  // Complete A/B regression: Overlay, manual/automatic Stack in both directions.
  const originalRaw=JSON.stringify(project.rawCurves);
  const load=async (payload,name)=>{
    await page.locator('#projectFile').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});
    try {
      await page.waitForFunction(name=>document.querySelector('#log')?.textContent?.includes('Project loaded: '+name),name,{timeout:60000});
    } catch(error) {
      const diagnostics=await page.evaluate(()=>({status:document.querySelector('#status')?.textContent,log:document.querySelector('#log')?.textContent?.slice(-1200),count:document.querySelector('#dataCount')?.textContent}));
      throw new Error(`Project load timeout for ${name}: ${JSON.stringify(diagnostics)}`,{cause:error});
    }
    await page.waitForTimeout(150);
    assert.ok(!await page.locator('#status').evaluate(e=>e.classList.contains('bad')),await page.locator('#status').textContent());
  };
  const save=async path=>{const [d]=await Promise.all([page.waitForEvent('download'),page.locator('#saveProjectBtn').click()]);await d.saveAs(path);return JSON.parse(fs.readFileSync(path));};
  for(const mode of ['overlay','manual-positive','manual-negative','auto-positive','auto-negative']){
    const manual=mode.startsWith('manual'),direction=mode.endsWith('negative')?-1:1,offset=mode==='overlay'?0:direction*(manual?3:4);
    const fixture={...project,config:{...project.config,subplots:project.config.subplots.map(sp=>({...sp,mode:mode==='overlay'?'overlay':'stack',offsetMode:manual?'manual':'auto',offsetScale:1,manualOffsets:'0,3',offsetDirection:direction,annotationsEnabled:true,annotations:[{source:'x',x:3320,label:'Marker',y:.2}],labelMode:'legend'}))}};
    await load(fixture,mode+'.spinplot.json');
    const data=await exportDisplay('browser-preview/'+mode+'.csv');
    assert.equal(valueFor(data,0,3300),-.5);assert.equal(valueFor(data,1,3300),-1+offset);
    const saved=await save('browser-preview/'+mode+'.json');assert.equal(JSON.stringify(saved.rawCurves),originalRaw,'Display settings never change raw data');
    await load(saved,mode+'-reload.spinplot.json');
    const restored=await exportDisplay('browser-preview/'+mode+'-reload.csv');assert.deepEqual(restored,data,'Project reload preserves display values');
  }
  // Vector and raster files use the same prepared model as the canvas preview.
  await page.locator('button.tab-btn[data-tab="export"]').click();
  await page.locator('button.tab-btn[data-tab="subplots"]').click();
  await page.locator('#canvasPreset').selectOption('square');
  await page.locator('button.tab-btn[data-tab="export"]').click();
  await page.locator('#exportDpi').selectOption('96');
  for(const format of ['svg','png']){
    await page.locator('#imageFormat').selectOption(format);
    const [d]=await Promise.all([page.waitForEvent('download'),page.locator('#exportImageBtnSide').click()]);
    const path='browser-preview/figure.'+format;await d.saveAs(path);const bytes=fs.readFileSync(path);
    if(format==='svg'){
      const result=await page.evaluate(svg=>{const doc=new DOMParser().parseFromString(svg,'image/svg+xml');return {error:!!doc.querySelector('parsererror'),paths:doc.querySelectorAll('path').length,text:doc.documentElement.textContent,width:doc.documentElement.getAttribute('width')};},bytes.toString());
      assert.equal(result.error,false);assert.ok(result.paths>10);assert.match(result.text,/Trace A/);assert.match(result.text,/Magnetic Field/);assert.match(result.text,/Marker/);assert.equal(result.width,'500');
    }else{
      assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(bytes.readUInt32BE(16),500);assert.equal(bytes.readUInt32BE(20),500);assert.ok(bytes.includes(Buffer.from('pHYs')));
      const decoded=await page.evaluate(async b64=>{const img=new Image();img.src='data:image/png;base64,'+b64;await img.decode();return [img.naturalWidth,img.naturalHeight];},bytes.toString('base64'));assert.deepEqual(decoded,[500,500]);
    }
  }
  // Exercise g labels and the shared 1D/2D renderer with acquired coordinates.
  const fieldProject={...project,rawCurves:project.rawCurves.map(c=>({...c,freq:9.5})),config:{...project.config,controls:{...project.config.controls,baselineMode:'none',canvasPreset:'4x3'},subplots:project.config.subplots.map(sp=>({...sp,annotationsEnabled:true,annotations:[{source:'g',g:2.05,label:'g marker',y:.2}]}))}};
  await load(fieldProject,'field-g.spinplot.json');
  await page.locator('button.tab-btn[data-tab="export"]').click();await page.locator('#imageFormat').selectOption('svg');
  const [gDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#exportImageBtnSide').click()]);await gDownload.saveAs('browser-preview/field-g.svg');assert.match(fs.readFileSync('browser-preview/field-g.svg','utf8'),/g factor/);assert.match(fs.readFileSync('browser-preview/field-g.svg','utf8'),/g marker/);
  const matrix={name:'Synthetic 2D',x:{name:'Field',unit:'G',values:[3300,3320,3350]},y:{name:'Microwave attenuation',unit:'dB',values:[0,10]},real:[[1,2,3],[2,4,6]],imag:[[0,0,0],[0,0,0]],metadata:{}};
  const mixed={...fieldProject,rawCurves:[...fieldProject.rawCurves,{name:'Synthetic 2D',source:'synthetic',freq:9.5,B:matrix.x.values,y:[1.5,3,4.5],matrix}],config:{...fieldProject.config,controls:{...fieldProject.config.controls,canvasPreset:'custom',canvasWidth:'1000',canvasHeight:'1000'},layout:{...project.config.layout,rows:2,cols:1,spans:'1 / 1'},subplots:[fieldProject.config.subplots[0],{...fieldProject.config.subplots[0],title:'Synthetic 2D',annotationsEnabled:false,curves:[],gridRow:2,twoD:{index:2,settings:{showScanCorrelation:false}}}]}};
  await load(mixed,'mixed.spinplot.json');await save('browser-preview/mixed.json');
  const testProjectionTitleSize = process.env.SPINPLOT_TEST_PROJECTION_TITLE_SIZE === '1';
  if (testProjectionTitleSize) {
    await page.locator('button.tab-btn[data-tab="style"]').click();
    await page.locator('#tickSize').fill('9');
    await page.locator('#projectionTitleSize').fill('23');
  }
  await page.locator('button.tab-btn[data-tab="export"]').click();await page.locator('#imageFormat').selectOption('svg');
  const [mixedDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#exportImageBtnSide').click()]);await mixedDownload.saveAs('browser-preview/mixed.svg');
  const mixedSvg=fs.readFileSync('browser-preview/mixed.svg','utf8');
  assert.match(mixedSvg,/Synthetic 2D/);
  if (testProjectionTitleSize) {
    const svgTexts=[...mixedSvg.matchAll(/<text[^>]*style="font:([^"]*)"[^>]*>([^<]*)<\/text>/g)].map(match=>({font:match[1],text:match[2].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')}));
    assert.ok(svgTexts.some(item=>/projection/i.test(item.text)&&/^23px\b/.test(item.font)), 'Projection title text must use the independent 23 px setting');
    assert.ok(svgTexts.some(item=>/^9px\b/.test(item.font)), 'Tick labels must retain their independent 9 px setting');
  }
  const [projectionDownload]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Export projection CSV',exact:true}).click()]);await projectionDownload.saveAs('browser-preview/projections.csv');
  await page.screenshot({path:'browser-preview/mixed.png',fullPage:true});
  assert.doesNotMatch(fs.readFileSync('browser-preview/mixed.svg','utf8'),/Y projection vs scan/,'2D import must not create an implicit scan plot');
  if (process.env.SPINPLOT_TEST_TWOD_VIEW_MODES === '1') {
    const source2D=mixed.config.subplots.find(sp=>sp.twoD);
    const extraView=(title,row,mode)=>({...JSON.parse(JSON.stringify(source2D)),title,mode,gridRow:row,gridCol:1,rowSpan:1,colSpan:1,twoD:{...source2D.twoD,settings:{...source2D.twoD.settings}}});
    const viewMixed={...mixed,config:{...mixed.config,layout:{...mixed.config.layout,rows:2,cols:1,spans:'1 / 1'},subplots:[
      {...source2D,title:'Synthetic 2D',mode:'overlay',gridRow:1,gridCol:1,rowSpan:1,colSpan:1,twoD:{...source2D.twoD,settings:{...source2D.twoD.settings}}},
      extraView('Overlap',2,'overlap')
    ]}};
    await load(viewMixed,'2d-view-modes.spinplot.json');
    await page.locator('button.tab-btn[data-tab="subplots"]').click();
    assert.equal(await page.locator('.subplot').count(),2,'No scan subplot is created on 2D import');
    await page.locator('[data-field="mode"]').first().selectOption('scan');
    await page.waitForTimeout(250);
    assert.equal(await page.locator('.subplot').count(),3,'Selecting Variable scan adds a separate subplot');
    const modes=await page.locator('[data-field="mode"]').evaluateAll(els=>els.map(e=>e.value));
    assert.deepEqual(modes,['overlay','scan','overlap'],'The source Heatmap remains alongside Variable scan and Overlap');
    const scanCard=page.locator('.subplot').nth(1);
    for(const key of ['xMode','yMode','projectionXMin','projectionXMax','projectionYMin','projectionYMax','showXProjection','showYProjection'])
      assert.equal(await scanCard.locator('[data-twod="'+key+'"]').isVisible(),false,'Variable scan must not expose 2D projection control '+key);
    for(const key of ['scanAxisMode','scanStatistic','scanStatisticMin','scanStatisticMax'])
      assert.equal(await scanCard.locator('[data-twod="'+key+'"]').isVisible(),true,'Variable scan control '+key+' must be visible');
    await scanCard.locator('[data-twod="scanStatistic"]').selectOption('max');
    await scanCard.locator('[data-twod="scanStatisticMin"]').fill('3320');
    await scanCard.locator('[data-twod="scanStatisticMax"]').fill('3350');
    await scanCard.locator('[data-twod="scanStatisticMax"]').press('Tab');
    const savedViews=await save('browser-preview/2d-view-modes.json');
    assert.equal(savedViews.config.subplots[0].mode,'overlay');
    assert.equal(savedViews.config.subplots[1].mode,'scan');
    assert.equal(savedViews.config.subplots[1].title,'','Variable scan starts without a subplot title');
    assert.equal(savedViews.config.subplots[1].gridRow,savedViews.config.subplots[0].gridRow);
    assert.equal(savedViews.config.subplots[1].gridCol,savedViews.config.subplots[0].gridCol+1,'Scan subplot is initially placed to the right of the source map');
    assert.equal(savedViews.config.subplots[2].mode,'overlap');
    assert.equal(savedViews.config.subplots[0].twoD.settings.yMode,'rms','Changing the scan statistic must not alter the source map right-projection statistic');
    assert.equal(savedViews.config.subplots[0].twoD.settings.projectionXMin,3300,'Changing the scan interval must not alter the source map projection interval');
    assert.equal(savedViews.config.subplots[1].twoD.settings.scanStatistic,'max');
    assert.equal(savedViews.config.subplots[1].twoD.settings.scanStatisticMin,3320);
    assert.equal(savedViews.config.subplots[1].twoD.settings.scanStatisticMax,3350);
    assert.equal(savedViews.config.layout.spans,'1,1 / 2','The added subplot is included in the saved layout');
    await page.locator('button.tab-btn[data-tab="export"]').click();await page.locator('#imageFormat').selectOption('svg');
    let viewsDownload;
    try { [viewsDownload]=await Promise.all([page.waitForEvent('download',{timeout:8000}),page.locator('#exportImageBtnSide').click()]); }
    catch (error) { throw new Error('2D view SVG export failed; status='+await page.locator('#status').textContent()+'; pageErrors='+errors.join(' | ')+'; '+error.message); }
    await viewsDownload.saveAs('browser-preview/2d-view-modes.svg');
    const viewsSvg=fs.readFileSync('browser-preview/2d-view-modes.svg','utf8');
    assert.doesNotMatch(viewsSvg,/>Variable scan<\/text>/,'Variable scan subplot has no default title');assert.match(viewsSvg,/Overlap/);assert.match(viewsSvg,/Microwave attenuation/);assert.match(viewsSvg,/Microwave attenuation = 0/);
  }
  // Current-branch-only interaction regression: wheel zoom -> colorbar double-click Auto Z,
  // then verify that a heatmap-body double-click still restores X/Y ranges.
  if (process.env.SPINPLOT_TEST_COLORBAR_DBLCLICK === '1') {
    const colorbarProject={...fieldProject,
      rawCurves:[{name:'Synthetic 2D',source:'synthetic',freq:9.5,B:matrix.x.values,y:[1.5,3,4.5],matrix}],
      config:{...fieldProject.config,
        controls:{...fieldProject.config.controls,baselineMode:'none',canvasPreset:'custom',canvasWidth:'1000',canvasHeight:'1000'},
        layout:{...fieldProject.config.layout,rows:1,cols:1,spans:'1'},
        subplots:[{...fieldProject.config.subplots[0],title:'Synthetic 2D',annotationsEnabled:false,curves:[],gridRow:1,
          xUseGlobal:false,xMin:3305,xMax:3345,yUseGlobal:false,yMin:-2,yMax:12,
          twoD:{index:0,settings:{mode:'heatmap',showColorbar:true,showProjections:false,showScanCorrelation:false,
            xMin:3305,xMax:3345,yMin:-2,yMax:12,zMin:'',zMax:'',zUseGlobal:false}}}]
      }
    };
    await load(colorbarProject,'colorbar-dblclick.spinplot.json');
    const canvas=page.locator('#plotCanvas'),bounds=await canvas.boundingBox();
    assert.ok(bounds&&bounds.width>0&&bounds.height>0,'2D canvas must be visible');
    // Locate the vertical color gradient in canvas pixels rather than assuming a fixed layout fraction.
    const barPoint=await canvas.evaluate(el=>{
      const ctx=el.getContext('2d'),w=el.width,h=el.height,p=ctx.getImageData(0,0,w,h).data;
      const xStart=Math.floor(w*0.65),xEnd=Math.floor(w*0.99),yStart=Math.floor(h*0.1),yEnd=Math.floor(h*0.95);
      const counts=new Array(w).fill(0);let bestX=-1,bestCount=0;
      for(let x=xStart;x<xEnd;x++){
        const colors=new Set();
        for(let y=yStart;y<yEnd;y++){const i=(y*w+x)*4;if(p[i+3])colors.add((p[i]<<16)|(p[i+1]<<8)|p[i+2]);}
        counts[x]=colors.size;if(colors.size>bestCount){bestCount=colors.size;bestX=x;}
      }
      if(bestX<0)return {colors:0};
      const threshold=Math.max(20,Math.floor(bestCount*0.8));let left=bestX,right=bestX;
      while(left>xStart&&counts[left-1]>=threshold)left--;
      while(right<xEnd-1&&counts[right+1]>=threshold)right++;
      const rect=el.getBoundingClientRect();
      return {x:rect.left+((left+right+1)/2)*(rect.width/w),y:rect.top+rect.height*0.5,colors:bestCount,width:right-left+1};
    });
    assert.ok(barPoint.colors>20,'A vertical colorbar gradient must be present in the 2D canvas');
    const barX=barPoint.x,barY=barPoint.y;
    await page.mouse.move(barX,barY);
    await page.mouse.wheel(0,120);
    await page.waitForTimeout(150);
    const zoomed=await save('browser-preview/colorbar-zoomed.json');
    const zoomedSettings=zoomed.config.subplots[0].twoD.settings;
    assert.notEqual(zoomedSettings.zMin,'','Colorbar wheel must set a local Z minimum');
    assert.notEqual(zoomedSettings.zMax,'','Colorbar wheel must set a local Z maximum');
    assert.equal(zoomedSettings.zUseGlobal,false,'Colorbar wheel must use local Z range');
    await page.mouse.dblclick(barX,barY);
    await page.waitForTimeout(150);
    const zReset=await save('browser-preview/colorbar-auto-z.json');
    const zSettings=zReset.config.subplots[0].twoD.settings;
    assert.equal(zSettings.zMin,'','Colorbar double-click must clear the local Z minimum');
    assert.equal(zSettings.zMax,'','Colorbar double-click must clear the local Z maximum');
    assert.equal(zSettings.zUseGlobal,false,'Auto Z must retain the existing Auto Z semantics');
    assert.equal(zSettings.xMin,3305,'Colorbar double-click must not reset X');
    assert.equal(zSettings.xMax,3345,'Colorbar double-click must not reset X');
    assert.equal(zSettings.yMin,-2,'Colorbar double-click must not reset Y');
    assert.equal(zSettings.yMax,12,'Colorbar double-click must not reset Y');
    await page.mouse.dblclick(bounds.x+bounds.width*0.45,bounds.y+bounds.height*0.6);
    await page.waitForTimeout(150);
    const xyReset=await save('browser-preview/heatmap-axis-reset.json');
    const xySettings=xyReset.config.subplots[0].twoD.settings;
    assert.equal(xySettings.xMin,3300,'Heatmap double-click must still reset X minimum');
    assert.equal(xySettings.xMax,3350,'Heatmap double-click must still reset X maximum');
    assert.equal(xySettings.yMin,0,'Heatmap double-click must still reset Y minimum');
    assert.equal(xySettings.yMax,10,'Heatmap double-click must still reset Y maximum');
    assert.equal(xySettings.zMin,'','Heatmap axis reset must not reapply a local Z range');
    // Restore the export control state so the pre-migration comparison remains apples-to-apples.
    await page.locator('#imageFormat').selectOption('svg');
  }

  if (process.env.SPINPLOT_TEST_MANUAL_CURVE_HEATMAP === '1') {
    await page.locator('button.tab-btn[data-tab="data"]').click();
    await page.locator('#clearDataBtn').click();
    await page.locator('#dataFiles').setInputFiles({name:'manual-curves.csv',mimeType:'text/csv',buffer:Buffer.from(
      'B,Trace A,Trace B,Trace C\n3300,0,0,0\n3310,1,2,3\n3320,2,4,6\n3330,0,0,0\n3340,-1,-2,-3\n3350,0,0,0\n'
    )});
    await page.waitForFunction(() => document.querySelector('#dataCount')?.textContent?.trim() === '3', null, {timeout:20000});
    await page.locator('button.tab-btn[data-tab="scaling"]').click();
    await page.locator('#baselineMode').selectOption('none');
    await page.locator('button.tab-btn[data-tab="subplots"]').click();
    const sourceCard = page.locator('.subplot').first();
    const legendSection = sourceCard.locator('details[data-section="legend"]');
    if (!await legendSection.evaluate(el => el.open)) await legendSection.locator('summary').first().click();
    const labelBounds = await sourceCard.locator('.label-settings-row > .field > label').boundingBox();
    const legendBounds = await sourceCard.locator('.label-settings-row .legend-position-field > summary').boundingBox();
    const labelControl = await sourceCard.locator('[data-field="labelMode"]').boundingBox();
    const legendControl = await sourceCard.locator('[data-field="legendPosition"]').boundingBox();
    assert.ok(labelBounds && legendBounds && Math.abs(labelBounds.y - legendBounds.y) <= 1, 'Label mode and Legend position labels must align');
    assert.ok(labelControl && legendControl && Math.abs(labelControl.y - legendControl.y) <= 1, 'Label mode and Legend position controls must align');
    assert.equal(await sourceCard.locator('[data-field="mode"] option[value="heatmap"]').count(),1,'Manual 1D subplots must offer Heatmap');
    assert.equal(await sourceCard.locator('[data-field="mode"] option[value="scan"]').count(),1,'Manual 1D subplots must offer Variable scan');
    await sourceCard.locator('.order-item[data-curve="2"]').click();
    await sourceCard.locator('[data-action="moveTop"]').click();
    assert.deepEqual(await sourceCard.locator('.order-item').evaluateAll(els=>els.map(el=>Number(el.dataset.curve))),[2,0,1]);
    await sourceCard.locator('[data-field="mode"]').selectOption('heatmap');
    await page.waitForTimeout(200);
    assert.equal(await sourceCard.locator('[data-field="mode"]').inputValue(),'heatmap','Manual curves must switch to Heatmap mode');
    assert.deepEqual(await sourceCard.locator('[data-field="mode"]').evaluate(el=>[...el.options].filter(o=>!o.hidden).map(o=>o.textContent.trim())),['Stack','Heatmap','Overlap','Variable scan (new subplot)'],'Curve-derived Heatmap must expose only the four supported plot modes');
    assert.equal(await sourceCard.locator('.manual-scan-variable').count(),1,'Manual Heatmap must show one scan-variable editor');
    assert.equal(await sourceCard.locator('.manual-scan-variable').evaluate(el=>el.open),false,'Scan-variable editor must be collapsed by default');
    assert.equal(await sourceCard.locator('[data-field="mode"]').evaluate(el=>{const panel=el.closest('.subplot-body')?.querySelector('.manual-scan-variable');return !!panel&&(el.compareDocumentPosition(panel)&Node.DOCUMENT_POSITION_FOLLOWING)!==0;}),true,'Scan-variable editor must appear after Plot mode');
    await sourceCard.locator('.manual-scan-variable summary').click();
    await page.evaluate(() => {window.__spinplotDrawnText=[];const original=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.__spinplotDrawnText.push(String(text));return original.call(this,text,...args);};});
    assert.equal(await sourceCard.locator('[data-manual-scan="name"]').inputValue(),'Subplot index','Default manual scan variable name');
    assert.equal(await sourceCard.locator('[data-manual-scan="unit"]').inputValue(),'','Scan variable unit defaults to blank');
    assert.equal(await sourceCard.locator('[data-manual-scan="mode"]').inputValue(),'linear','Equal spacing is the default');
    assert.equal(await sourceCard.locator('.manual-scan-variable').count(),1,'Manual Heatmap must show one scan-variable editor, not duplicate panels');
    assert.equal(await sourceCard.locator('[data-manual-scan="start"]').inputValue(),'1','Default scan variable starts at subplot index 1');
    assert.equal(await sourceCard.locator('[data-manual-scan="step"]').inputValue(),'1','Default scan variable step is 1');
    await sourceCard.locator('[data-manual-scan="start"]').fill('2');
    await sourceCard.locator('[data-manual-scan="start"]').press('Tab');
    await sourceCard.locator('[data-manual-scan="step"]').fill('2');
    await sourceCard.locator('[data-manual-scan="step"]').press('Tab');
    await page.waitForTimeout(150);
    assert.ok(await page.evaluate(() => window.__spinplotDrawnText.includes('Subplot index')),'Curve-derived Heatmap must display its Y-axis title by default');
    await sourceCard.locator('[data-manual-scan="mode"]').selectOption('array');
    assert.equal(await sourceCard.locator('[data-manual-scan="values"]').inputValue(),'2, 4, 6','Equal spacing values must follow Current order');
    await sourceCard.locator('[data-manual-scan="name"]').fill('Temperature');
    await sourceCard.locator('[data-manual-scan="name"]').press('Tab');
    await sourceCard.locator('[data-manual-scan="unit"]').fill('K');
    await sourceCard.locator('[data-manual-scan="unit"]').press('Tab');
    await sourceCard.locator('[data-manual-scan="mode"]').selectOption('array');
    await sourceCard.locator('[data-manual-scan="values"]').fill('2, 3, 6');
    await sourceCard.locator('[data-manual-scan="values"]').press('Tab');
    await sourceCard.locator('[data-field="mode"]').selectOption('scan');
    await page.waitForTimeout(200);
    assert.equal(await page.locator('.subplot').count(),2,'Manual Variable scan must create an independent subplot');
    assert.equal(await page.locator('.subplot').nth(0).locator('[data-field="mode"]').inputValue(),'heatmap','Source heatmap must remain unchanged');
    assert.equal(await page.locator('.subplot').nth(1).locator('[data-field="mode"]').inputValue(),'scan','New subplot must use Variable scan mode');
    const scanCard = page.locator('.subplot').nth(1);
    assert.equal(await scanCard.locator('[data-manual-scan="name"]').inputValue(),'Temperature');
    assert.equal(await scanCard.locator('[data-manual-scan="unit"]').inputValue(),'K');
    assert.equal(await sourceCard.locator('[data-manual-scan="values"]').inputValue(),'2, 3, 6','Custom scan values must follow the selected curve order');
    assert.equal(await sourceCard.locator('.manual-scan-variable').evaluate(el=>el.open),false,'Scan-variable editor must remain collapsed in Heatmap mode');
    await page.locator('button.tab-btn[data-tab="export"]').click();
    const saved=await save('browser-preview/manual-curves.spinplot.json');
    assert.equal(saved.rawCurves.length,3,'Derived heatmap must not append duplicate matrix data to the source data list');
    assert.ok(saved.rawCurves.every(curve=>!curve.matrix),'Original raw curve records must remain 1D');
    assert.equal(saved.config.subplots[0].twoD.derivedFromCurves,true);
    assert.deepEqual(saved.config.subplots[0].twoD.curveIndices,[2,0,1]);
    assert.deepEqual(saved.config.subplots[0].scanVariable.valuesByCurve,{0:3,1:6,2:2});
    assert.equal(saved.config.subplots[0].scanVariable.name,'Temperature');
    assert.equal(saved.config.subplots[0].scanVariable.unit,'K');
    assert.equal(saved.config.subplots[1].twoD.derivedFromCurves,true);
    assert.deepEqual(saved.config.subplots[1].scanVariable.valuesByCurve,{0:30,1:80,2:10});
    let projectionDownload;
    try {
      [projectionDownload] = await Promise.all([
        page.waitForEvent('download',{timeout:15000}),
        page.getByRole('button',{name:'Export projection CSV',exact:true}).click()
      ]);
    } catch (error) {
      const diagnostics = await page.evaluate(() => ({
        status: document.querySelector('#statusMain')?.textContent || '',
        log: document.querySelector('#log')?.textContent || '',
        exportButtonCount: [...document.querySelectorAll('button')].filter(button => button.textContent.trim() === 'Export projection CSV').length,
        exportButtonDisabled: [...document.querySelectorAll('button')].filter(button => button.textContent.trim() === 'Export projection CSV').map(button => button.disabled)
      }));
      throw new Error('Projection CSV download failed: ' + error.message + '; diagnostics=' + JSON.stringify({...diagnostics, pageErrors: errors.slice(-10)}));
    }
    await projectionDownload.saveAs('browser-preview/manual-curve-projections.csv');
    const projectionRows=fs.readFileSync('browser-preview/manual-curve-projections.csv','utf8').trim().split(/\r?\n/).map(line=>line.split(','));
    const yRows=projectionRows.filter(row=>row[0]==='Y');
    assert.deepEqual(yRows.map(row=>Number(row[1])),[2,3,6],'Heatmap must use the custom non-uniform variable values');
    const projected=yRows.map(row=>Number(row[2]));
    assert.deepEqual(projected,[3,1,2],'Signal rows must remain mapped to the selected source curves after reordering');
    await load(saved,'manual-curves-reload.spinplot.json');
    assert.equal(await page.locator('.subplot').count(),2,'Manual heatmap and Variable scan must survive project reload');
    assert.equal(await page.locator('.subplot').first().locator('[data-field="mode"]').inputValue(),'heatmap');
    assert.equal(await page.locator('.subplot').nth(1).locator('[data-field="mode"]').inputValue(),'scan');
    assert.equal(await page.locator('.subplot').first().locator('[data-manual-scan="values"]').inputValue(),'2, 3, 6');
  }

  // A legacy single-trace CSV can still be opened after a multi-curve project.
  await page.locator('button.tab-btn[data-tab="scaling"]').click();
  await page.locator('#baselineMode').selectOption('none');
  await page.locator('#clearDataBtn').click();
  await page.locator('#dataFiles').setInputFiles({name:'legacy.csv',mimeType:'text/csv',buffer:Buffer.from('B,Legacy\r\n3350,1\r\n3340,2\r\n3330,3\r\n')});
  await page.waitForFunction(()=>document.querySelector('#dataCount').textContent.trim()==='1');
  const legacy=await save('browser-preview/legacy.json');assert.deepEqual(legacy.rawCurves[0].B,[3350,3340,3330]);assert.deepEqual(legacy.rawCurves[0].y,[1,2,3]);
  // Restore test data for responsive layout and screenshots.
  await load(project,'responsive.spinplot.json');
  for(const width of [1440,1100,760,420]){
    await page.setViewportSize({width,height:900});await page.waitForTimeout(200);
    assert.equal(await page.locator('.tab-btn').count(),6);
    const bounds=await page.locator('#plotCanvas').boundingBox();assert.ok(bounds.width>0&&bounds.height>0);
    assert.ok(!await page.locator('#status').evaluate(e=>e.classList.contains('bad')));
    await page.screenshot({path:'browser-preview/window-'+width+'.png',fullPage:true});
  }
  assert.equal(errors.length,0,'Browser script error: '+errors.join(' | '));
  await page.close();
  const narrow = await browser.newPage({viewport:{width:650,height:850}});
  narrow.on('pageerror',err=>errors.push(err.message));
  const responseN = await narrow.goto(url,{waitUntil:'networkidle',timeout:45000});
  assert.equal(responseN.status(),200);
  assert.equal(await narrow.locator('.tab-btn').count(),6);
  await narrow.screenshot({path:'browser-preview/spinplot-narrow.png',fullPage:true});
  assert.equal(errors.length,0,'Browser script error: '+errors.join(' | '));
  fs.writeFileSync('browser-preview/result.json',JSON.stringify({url,errors,passed:true,viewports:[1440,1100,760,650,420]},null,2));
  console.log('BROWSER PASS: CSV import/export, region baseline and stack display values, project v9/10/11, config v10, wide/narrow');
} finally {
  await browser.close();
}
