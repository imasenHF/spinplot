import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

function discover(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return discover(path);
    return entry.isFile() && entry.name.endsWith('.test.js') ? [path] : [];
  });
}

const files = discover('src').sort();
if (!files.length) {
  console.error('No unit tests found in src/');
  process.exitCode = 1;
} else {
  let failed = 0;
  for (const file of files) {
    const name = relative('.', file);
    console.log(`\n=== ${name} ===`);
    const result = spawnSync(process.execPath, [file], {
      stdio: 'inherit',
      env: process.env,
    });
    if (result.status !== 0) failed++;
  }
  console.log(`\nUnit test files: ${files.length}; failed: ${failed}`);
  if (failed) process.exitCode = 1;
}
