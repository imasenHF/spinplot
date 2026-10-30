import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173'], {
  stdio: 'ignore',
  shell: process.platform === 'win32'
});
let browser;
try {
  let started = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await fetch('http://127.0.0.1:4173/spinplot/');
      if (response.ok) { started = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(started, 'Vite development server is available');
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ acceptDownloads: true });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('http://127.0.0.1:4173/spinplot/', { waitUntil: 'networkidle' });

  // The top-level toolbar keeps only seven high-frequency actions.
  const toolbarButtons = await page.locator('.top-actions > button.tool-btn').evaluateAll(
    buttons => buttons.map(button => button.id));
  assert.deepEqual(toolbarButtons, [
    'openDataBtn','openProjectBtn','saveProjectBtn',
    'undoBtn','redoBtn','clearDataBtn','exportImageBtn'
  ]);
  for (const id of ['renderBtnTop','clearConfigBtn','saveConfigBtn','configFile','clearConfigBtnSide']) {
    assert.equal(await page.locator('#'+id).count(),0,id+' must not remain');
  }
  assert.equal(await page.locator('#saveConfigBtnSide').count(),1);
  assert.equal(await page.locator('#configFileSide').count(),1);
  assert.ok(await page.locator('#exportImageBtn .tool-text').isVisible());
  const [dataChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('#openDataBtn').click()
  ]);
  assert.equal(dataChooser.isMultiple(),true);
  await dataChooser.setFiles({
    name: 'legend-fixture.csv', mimeType: 'text/csv',
    buffer: Buffer.from('B,Trace A,Trace B\n3300,0,0\n3310,1,2\n3320,2,4\n3330,-1,-2\n3340,0,0\n')
  });
  await page.waitForFunction(() => document.querySelector('#dataCount')?.textContent?.trim() === '2');
  const [projectChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('#openProjectBtn').click()
  ]);
  assert.equal(projectChooser.isMultiple(),false);

  await page.locator('button.tab-btn[data-tab="style"]').click();
  assert.equal(await page.locator('#globalLegendPosition').inputValue(), 'upper_right');
  assert.equal(await page.locator('#globalLegendPosition option').count(), 11);
  await page.locator('#globalLegendPosition').selectOption('lower_left');

  await page.locator('button.tab-btn[data-tab="data"]').click();
  await page.locator('button.tab-btn[data-tab="subplots"]').click();
  const source = page.locator('.subplot').first();
  if (await source.evaluate(el => el.classList.contains('collapsed'))) {
    await source.locator('[data-action="collapse"]').click();
  }
  assert.equal(await source.locator('[data-field="legendPosition"]').inputValue(), 'inherit');
  await source.locator('[data-field="mode"]').selectOption('scan');
  await page.waitForFunction(() => document.querySelectorAll('.subplot').length === 2);

  const scan = page.locator('.subplot').last();
  const legendSection = scan.locator('details[data-section="legend"]');
  assert.ok(await legendSection.isVisible(), 'Variable scan must expose its label settings');
  assert.equal(await legendSection.evaluate(el => el.open), true,
    'Variable scan label settings should be expanded by default');
  assert.equal(await scan.locator('[data-field="labelMode"]').inputValue(), 'legend');
  assert.equal(await scan.locator('[data-field="legendPosition"]').inputValue(), 'inherit');
  await scan.locator('[data-field="legendPosition"]').selectOption('upper_center');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#saveProjectBtn').click()
  ]);
  const project = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
  assert.equal(project.config.controls.globalLegendPosition, 'lower_left');
  assert.equal(project.config.subplots[0].legendPosition, 'inherit');
  assert.equal(project.config.subplots[1].legendPosition, 'upper_center');

  await scan.locator('[data-field="labelMode"]').selectOption('none');
  const [noneDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#saveProjectBtn').click()
  ]);
  const hiddenProject = JSON.parse(await fs.readFile(await noneDownload.path(), 'utf8'));
  assert.equal(hiddenProject.config.subplots[1].labelMode, 'none',
    'Variable scan label visibility must remain user-controlled');
  await page.locator('button.tab-btn[data-tab="export"]').click();
  const configDownloadPromise=page.waitForEvent('download',{timeout:8000});
  await page.locator('#saveConfigBtnSide').click();
  let configDownload;
  try { configDownload=await configDownloadPromise; }
  catch(error) {
    const diagnostics=await page.evaluate(()=>({
      handler: String(document.querySelector('#saveConfigBtnSide')?.onclick),
      status: document.querySelector('#status')?.textContent,
      log: document.querySelector('#log')?.textContent?.slice(-550)
    }));
    throw new Error('Config download unavailable: '+JSON.stringify({diagnostics,pageErrors}),{cause:error});
  }
  const config = JSON.parse(await fs.readFile(await configDownload.path(),'utf8'));
  assert.equal(config.version,10);
  await page.locator('#imageFormat').selectOption('svg');
  const [figureDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#exportImageBtn').click()
  ]);
  assert.match(figureDownload.suggestedFilename(),/\.svg$/i);
  await page.locator('#clearDataBtn').click();
  await page.waitForFunction(() => document.querySelector('#dataCount')?.textContent?.trim() === '0');
  assert.deepEqual(pageErrors, []);
  console.log('PASS: global legend position, scan labels, local override and persistence');
} finally {
  await browser?.close();
  server.kill();
}
