import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
assert.match(pkg.version, /^\d+\.\d+\.\d+$/, 'Use a MAJOR.MINOR.PATCH application version');
assert.equal(lock.version, pkg.version, 'Lockfile version must match package.json');
assert.equal(lock.packages[''].version, pkg.version, 'Lockfile root version must match package.json');
const base = process.env.SPINPLOT_BASE_SHA;
if (base) {
  assert.match(base, /^[a-f0-9]{40}$/, 'Expected a full base commit SHA');
  const changed = execFileSync('git', ['diff', '--name-only', base, 'HEAD'], { encoding: 'utf8' }).trim().split('\n');
  const previous = JSON.parse(execFileSync('git', ['show', base + ':package.json'], { encoding: 'utf8' })).version;
  const appChanged = changed.some(path => /^(src\/|public\/|index\.html$|package(?:-lock)?\.json$|vite\.config\.|tsconfig\.json$)/.test(path));
  if (appChanged) {
    const a = pkg.version.split('.').map(Number), b = previous.split('.').map(Number);
    const first = a.findIndex((n, i) => n !== b[i]);
    assert.ok(first >= 0 && a[first] > b[first], 'Application changes require a new version greater than ' + previous);
    assert.ok(readFileSync('CHANGELOG.md', 'utf8').split('\n').some(line => line.startsWith('## ' + pkg.version + ' — ')), 'Add a dated Changelog entry for the new version');
  }
  console.log('Version policy passed: ' + previous + ' → ' + pkg.version + (appChanged ? '' : ' (documentation/tooling only)'));
} else {
  console.log('Package and lockfile versions agree: ' + pkg.version);
}
