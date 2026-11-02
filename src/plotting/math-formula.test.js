import assert from 'node:assert/strict';
import test from 'node:test';
import { drawScanFitFormula, drawScanPowerAxisLabel, measureScanFitFormula, scanFitFormulaType } from './math-formula.js';

function context() {
  let font = '12px Arial';
  const calls = [];
  return {
    calls,
    save() {},
    restore() {},
    beginPath() { calls.push({ type: 'begin' }); },
    moveTo(x, y) { calls.push({ type: 'move', x, y }); },
    lineTo(x, y) { calls.push({ type: 'line', x, y }); },
    stroke() { calls.push({ type: 'stroke' }); },
    fillText(text, x, y) { calls.push({ type: 'text', text, x, y, font }); },
    measureText(value) {
      const size = Number(font.match(/([\d.]+)px/)?.[1] || 12);
      return { width: String(value).length * size * 0.55 };
    },
    get font() { return font; },
    set font(value) { font = value; },
  };
}

test('plot formula lines are recognized by model', () => {
  assert.equal(scanFitFormulaType('Spp(P) = I₀·sqrt(P)/(1 + P/P½)^(b/2)'), 'amplitude');
  assert.equal(scanFitFormulaType('ΔB(P) = A·sqrt(1 + P/Psat) + C'), 'linewidth');
  assert.equal(scanFitFormulaType('RMSE = 0.12'), null);
});

test('Bruker amplitude formula is laid out with a vector fraction bar', () => {
  const ctx = context();
  const metrics = measureScanFitFormula(ctx, 'amplitude', 12, 'Times New Roman');
  assert.ok(metrics.width > 0 && metrics.height >= 12 * 2.4,
    'The formula row must include the lower P½ subscript and clearance before the next parameter row');
  const drawn = drawScanFitFormula(ctx, 'amplitude', 10, 20, 12, 'Times New Roman', '#111');
  assert.equal(drawn.type, 'amplitude');
  assert.equal(ctx.calls.filter(call => call.type === 'stroke').length, 2,
    'Amplitude formula draws both the radical vinculum and the fraction bar as vector paths');
  const text = ctx.calls.filter(call => call.type === 'text').map(call => call.text);
  assert.ok(text.includes('S'));
  assert.ok(text.includes('pp'));
  assert.ok(text.includes('I'));
  assert.ok(text.includes('0'));
  assert.ok(text.includes('1/2'));
  assert.ok(text.includes('b/2'));
  assert.ok(!text.some(value => value.includes('√')),
    'The radical is a vector path, not a Unicode checkmark-shaped glyph');
});

test('linewidth formula is laid out with a radical overbar', () => {
  const ctx = context();
  const metrics = measureScanFitFormula(ctx, 'linewidth', 12, 'Georgia');
  assert.ok(metrics.width > 0 && metrics.height >= 12 * 2,
    'The radical formula row must leave clearance before the next parameter row');
  drawScanFitFormula(ctx, 'linewidth', 0, 0, 12, 'Georgia', '#222');
  const text = ctx.calls.filter(call => call.type === 'text').map(call => call.text);
  assert.ok(text.includes('Δ'));
  assert.ok(text.includes('B'));
  assert.ok(text.includes('sat'));
  assert.ok(!text.some(value => value.includes('√')),
    'The radical is a vector path with a vinculum over the full radicand');
  assert.equal(ctx.calls.filter(call => call.type === 'stroke').length, 1);
});

test('square-root power axis label uses two vector radicals and no Unicode glyph', () => {
  const ctx = context();
  const width = drawScanPowerAxisLabel(ctx, 100, 10, 14, 'Arial', '#111');
  assert.ok(width > 0);
  const text = ctx.calls.filter(call => call.type === 'text').map(call => call.text);
  assert.ok(text.includes('P'));
  assert.ok(text.includes('mW'));
  assert.ok(!text.some(value => value.includes('√')));
  assert.equal(ctx.calls.filter(call => call.type === 'stroke').length, 2);
});
