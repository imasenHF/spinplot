import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const host = '127.0.0.1';
const port = Number(process.env.SPINPLOT_BROWSER_PORT || 4173);
assert.ok(Number.isInteger(port) && port > 0 && port < 65536, 'Invalid browser-test port');

const origin = `http://${host}:${port}`;
const url = `${origin}/spinplot/`;
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const viteCli = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));

function runNode(script, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], { stdio: 'inherit', env });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} failed (${signal || `exit code ${code}`})`));
    });
  });
}

const server = spawn(
  process.execPath,
  [viteCli, '--host', host, '--port', String(port), '--strictPort'],
  { stdio: 'inherit', env: process.env },
);
let serverError;
server.once('error', (error) => {
  serverError = error;
});

async function stopServer() {
  if (server.exitCode !== null || server.signalCode !== null) return;

  server.kill('SIGTERM');
  await new Promise((resolve) => {
    server.once('exit', resolve);
    const timer = setTimeout(resolve, 3000);
    timer.unref();
  });

  if (server.exitCode === null && server.signalCode === null) {
    server.kill('SIGKILL');
  }
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (serverError) throw serverError;
    if (server.exitCode !== null) {
      throw new Error(`Vite dev server exited with code ${server.exitCode}`);
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      // The server is still starting.
    }

    await delay(500);
  }

  assert.ok(ready, `Vite dev server did not become ready at ${url}`);
  await delay(250);
  if (serverError) throw serverError;
  if (server.exitCode !== null) {
    throw new Error(`Vite dev server exited with code ${server.exitCode}`);
  }

  const browserEnv = {
    ...process.env,
    SPINPLOT_TEST_URL: url,
    SPINPLOT_EXPECT_VERSION: packageJson.version,
    SPINPLOT_TEST_COLORBAR_DBLCLICK: '1',
    SPINPLOT_TEST_FREQUENCY_ALIGNMENT: '1',
    SPINPLOT_TEST_TWOD_VIEW_MODES: '1',
    SPINPLOT_TEST_MANUAL_CURVE_HEATMAP: '1',
    SPINPLOT_TEST_HEATMAP_DATA_PANEL: '1',
    SPINPLOT_TEST_ADJACENT_SYMBOL_COLUMN: '1',
    SPINPLOT_TEST_EXTERNAL_CURVE_STYLE_LAYOUT: '1',
    SPINPLOT_TEST_SURFACE_CONTOUR: '1',
    SPINPLOT_TEST_AXIS_LOG: '1',
    SPINPLOT_TEST_AXIS_DISPLAY: '1',
    SPINPLOT_TEST_PROJECTION_TITLE_SIZE: '1',
    SPINPLOT_TEST_POWER_SATURATION: '1',
    SPINPLOT_TEST_EMPTY_PROJECTION_SPACE: '1',
  };

  await runNode('scripts/preview-browser-smoke.mjs', browserEnv);
  await runNode('scripts/toolbar-browser-smoke.mjs', browserEnv);
  console.log('SpinPlot browser regression passed.');
} finally {
  await stopServer();
}
