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
  // Verify the new pure baseline module through the real UI and exported display data.
  await page.locator('button.tab-btn[data-tab="scaling"]').click();
  await page.locator('#baselineMode').selectOption('region');
  await page.locator('#baselineRegions').fill('3300-3310');
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
  const baselineCSV=await exportDisplay('browser-preview/region-baseline.csv');
  const valueFor=(data,curve,field)=>{
    const i=data.header.indexOf('curve_index'),j=data.header.indexOf('coordinate'),k=data.header.indexOf('Y_display');
    assert.ok(i>=0&&j>=0&&k>=0,'Display CSV must contain coordinate, curve index and intensity');
    const row=data.rows.find(r=>Number(r[i])===curve&&Number(r[j])===field);
    assert.ok(row,'Expected synthetic curve/sample point in display CSV');
    return Number(row[k]);
  };
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
  const mixed={...fieldProject,rawCurves:[...fieldProject.rawCurves,{name:'Synthetic 2D',source:'synthetic',freq:9.5,B:matrix.x.values,y:[1.5,3,4.5],matrix}],config:{...fieldProject.config,controls:{...fieldProject.config.controls,canvasPreset:'custom',canvasWidth:'1000',canvasHeight:'1000'},layout:{...project.config.layout,rows:2,cols:1,spans:'1 / 1'},subplots:[fieldProject.config.subplots[0],{...fieldProject.config.subplots[0],title:'Synthetic 2D',annotationsEnabled:false,curves:[],gridRow:2,twoD:{index:2,settings:{}}}]}};
  await load(mixed,'mixed.spinplot.json');await save('browser-preview/mixed.json');
  await page.locator('button.tab-btn[data-tab="export"]').click();await page.locator('#imageFormat').selectOption('svg');
  const [mixedDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#exportImageBtnSide').click()]);await mixedDownload.saveAs('browser-preview/mixed.svg');assert.match(fs.readFileSync('browser-preview/mixed.svg','utf8'),/Synthetic 2D/);
  const [projectionDownload]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Export projection CSV',exact:true}).click()]);await projectionDownload.saveAs('browser-preview/projections.csv');
  await page.screenshot({path:'browser-preview/mixed.png',fullPage:true});
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
          twoD:{index:0,settings:{mode:'heatmap',showColorbar:true,showProjections:false,
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
