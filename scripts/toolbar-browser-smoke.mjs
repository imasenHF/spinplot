import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const url = process.env.SPINPLOT_TEST_URL;
assert.ok(url, 'SPINPLOT_TEST_URL must point to the local SpinPlot page');

mkdirSync('browser-preview', { recursive: true });

const browser = await chromium.launch({
  headless: true,
  ...(process.env.SPINPLOT_CHROMIUM_PATH
    ? {
        executablePath: process.env.SPINPLOT_CHROMIUM_PATH,
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      }
    : {}),
});

const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  assert.equal(response.status(), 200, 'Local SpinPlot page must be served');
  await page.waitForFunction(
    () => document.querySelector('#statusMain')?.textContent?.includes('Waiting for data'),
    null,
    { timeout: 15000 },
  );

  const topToolbar = page.locator('.top-actions[role="toolbar"]');
  assert.equal(await topToolbar.count(), 1, 'One file-operation toolbar must be present');

  const expectedButtons = [
    { id: 'openDataBtn', label: 'Open Data' },
    { id: 'openProjectBtn', label: 'Open Project' },
    { id: 'saveProjectBtn', label: 'Save Project' },
    { id: 'undoBtn', label: 'Undo' },
    { id: 'redoBtn', label: 'Redo' },
    { id: 'clearDataBtn', label: 'Clear Data' },
    { id: 'exportImageBtn', label: 'Export Figure' },
  ];

  const actualButtons = await topToolbar.locator('button.tool-btn').evaluateAll((buttons) =>
    buttons.map((button) => ({
      id: button.id,
      label: button.getAttribute('aria-label'),
    })),
  );
  assert.deepEqual(
    actualButtons,
    expectedButtons,
    'Top toolbar must retain the seven accessible actions in the documented order',
  );

  for (const button of expectedButtons) {
    const metrics = await page.locator(`#${button.id}`).evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const icon = element.querySelector('svg')?.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        iconWidth: icon?.width ?? null,
        iconHeight: icon?.height ?? null,
      };
    });

    assert.equal(metrics.height, 27, `${button.id} must be 27 px high`);
    assert.equal(metrics.iconWidth, 14, `${button.id} SVG icon must be 14 px wide`);
    assert.equal(metrics.iconHeight, 14, `${button.id} SVG icon must be 14 px high`);

    if (button.id === 'exportImageBtn') {
      assert.ok(metrics.width >= 86, 'Export button must retain its minimum width');
    } else {
      assert.equal(metrics.width, 28, `${button.id} must be 28 px wide`);
    }
  }

  for (const id of ['fitBtn', 'fitYBtn', 'measureBtn', 'clearMeasurementsBtn']) {
    const height = await page.locator(`#${id}`).evaluate(
      (element) => element.getBoundingClientRect().height,
    );
    assert.equal(height, 27, `${id} in the plot toolbar must match the 27 px button height`);
  }

  const [dataChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('#openDataBtn').click(),
  ]);
  assert.equal(dataChooser.isMultiple(), true, 'Open Data must allow multiple files');

  const [projectChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('#openProjectBtn').click(),
  ]);
  assert.equal(projectChooser.isMultiple(), false, 'Open Project must select one project file');

  await page.locator('button.tab-btn[data-tab="export"]').click();
  assert.equal(
    await page.locator('#fileOperationsCard').isVisible(),
    true,
    'Export must expose the Config / Project panel',
  );

  await page.screenshot({ path: 'browser-preview/toolbar.png', fullPage: true });
  assert.deepEqual(errors, [], `Toolbar browser regression raised errors: ${errors.join(' | ')}`);
  console.log(
    'Toolbar browser regression passed: seven actions, geometry, icons and file pickers.',
  );
} finally {
  await browser.close();
}
