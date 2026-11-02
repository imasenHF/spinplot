const FORMULA_LINES = Object.freeze({
  amplitude: 'Spp(P) = I₀·sqrt(P)/(1 + P/P½)^(b/2)',
  linewidth: 'ΔB(P) = A·sqrt(1 + P/Psat) + C',
});

export function scanFitFormulaType(line) {
  return Object.entries(FORMULA_LINES).find(([, value]) => value === line)?.[0] || null;
}

function setFont(ctx, size, family, italic = false) {
  ctx.font = `${italic ? 'italic ' : ''}${size}px ${family}`;
}

function drawSequence(ctx, tokens, x, baseline, size, family, color, draw) {
  let cursor = x;
  for (const token of tokens) {
    if (token.script) {
      const scriptSize = size * 0.62;
      const scriptBaseline = baseline + (token.script === 'sub' ? size * 0.22 : -size * 0.43);
      setFont(ctx, scriptSize, family, token.italic === true);
      const width = ctx.measureText(token.text).width;
      if (draw) {
        ctx.fillStyle = color;
        ctx.fillText(token.text, cursor, scriptBaseline);
      }
      cursor += width;
      continue;
    }
    setFont(ctx, size, family, token.italic === true);
    const width = ctx.measureText(token.text).width;
    if (draw) {
      ctx.fillStyle = color;
      ctx.fillText(token.text, cursor, baseline);
    }
    cursor += width;
  }
  return cursor - x;
}

const text = (value, italic = false) => ({ text: value, italic });
const script = (value, position, italic = true) => ({ text: value, script: position, italic });

function radicalAdvance(size) {
  return size * 0.72;
}

// Draw a proper radical as vector strokes. The vinculum spans the complete radicand.
function drawRadical(ctx, x, baseline, radicandWidth, size) {
  const advance = radicalAdvance(size),
    radicandX = x + advance * 0.78,
    barY = baseline - size * 0.84;
  ctx.beginPath();
  ctx.moveTo(x, baseline - size * 0.18);
  ctx.lineTo(x + size * 0.16, baseline - size * 0.18);
  ctx.lineTo(x + size * 0.34, baseline + size * 0.08);
  ctx.lineTo(x + size * 0.56, barY);
  ctx.lineTo(radicandX + radicandWidth + size * 0.035, barY);
  ctx.stroke();
  return { advance, radicandX, width: radicandX - x + radicandWidth };
}

export function drawScanPowerAxisLabel(ctx, centerX, top, size, family, color) {
  ctx.save();
  setFont(ctx, size, family);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.8, size * 0.06);
  const pWidth = ctx.measureText('P').width,
    unitWidth = ctx.measureText('mW').width,
    openWidth = ctx.measureText(' (').width,
    closeWidth = ctx.measureText(')').width,
    radicalWidth = radicalAdvance(size) * 0.78,
    totalWidth = radicalWidth + pWidth + openWidth + radicalWidth + unitWidth + closeWidth,
    baseline = top + size * 0.92;
  let x = centerX - totalWidth / 2;
  const pRoot = drawRadical(ctx, x, baseline, pWidth, size);
  ctx.fillText('P', pRoot.radicandX, baseline);
  x += pRoot.width;
  ctx.fillText(' (', x, baseline);
  x += openWidth;
  const unitRoot = drawRadical(ctx, x, baseline, unitWidth, size);
  ctx.fillText('mW', unitRoot.radicandX, baseline);
  x += unitRoot.width;
  ctx.fillText(')', x, baseline);
  ctx.restore();
  return totalWidth;
}

function layout(ctx, type, size, family) {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const lhs = type === 'amplitude'
    ? [text('S', true), script('pp', 'sub'), text('('), text('P', true), text(') =')]
    : [text('Δ'), text('B', true), script('pp', 'sub'), text('('), text('P', true), text(') = '), text('A', true)];
  const lhsWidth = drawSequence(ctx, lhs, 0, 0, size, family, '#000', false);
  let result;
  if (type === 'amplitude') {
    const numeratorPrefix = [text('I', true), script('0', 'sub')];
    const numerator = [text('P', true)];
    const numeratorPrefixWidth = drawSequence(ctx, numeratorPrefix, 0, 0, size, family, '#000', false);
    const numeratorTextWidth = drawSequence(ctx, numerator, 0, 0, size, family, '#000', false);
    const numeratorRadicalWidth = radicalAdvance(size) * 0.78;
    const numeratorGap = size * 0.12;
    const denominator = [
      text('('), text('1 + '), text('P', true), text('/'), text('P', true),
      script('1/2', 'sub'), text(')'), script('b/2', 'super'),
    ];
    const numeratorWidth = numeratorPrefixWidth + numeratorGap + numeratorRadicalWidth + numeratorTextWidth;
    const denominatorWidth = drawSequence(ctx, denominator, 0, 0, size, family, '#000', false);
    const gap = size * 0.6;
    const fractionWidth = Math.max(numeratorWidth, denominatorWidth) + size * 0.6;
    result = {
      type, lhs, numeratorPrefix, numerator, denominator, lhsWidth, numeratorWidth,
      numeratorPrefixWidth, numeratorGap, numeratorTextWidth, numeratorRadicalWidth,
      denominatorWidth, gap, fractionWidth,
      width: lhsWidth + gap + fractionWidth, height: size * 2.42,
    };
  } else if (type === 'linewidth') {
    const radicand = [
      text('('), text('1 + '), text('P', true), text('/'), text('P', true),
      script('sat', 'sub'), text(')'),
    ];
    const radicandWidth = drawSequence(ctx, radicand, 0, 0, size, family, '#000', false);
    const radicalWidth = radicalAdvance(size * 1.12);
    const suffixWidth = drawSequence(ctx, [text(' + C')], 0, 0, size, family, '#000', false);
    const gap = size * 0.5;
    result = {
      type, lhs, radicand, lhsWidth, radicandWidth, radicalWidth, suffixWidth, gap,
      width: lhsWidth + gap + radicalWidth * 0.78 + radicandWidth + size * 0.25 + suffixWidth,
      height: size * 2.02,
    };
  } else {
    result = { type: null, width: 0, height: 0 };
  }
  ctx.restore();
  return result;
}

export function measureScanFitFormula(ctx, type, size, family = 'Times New Roman') {
  return layout(ctx, type, size, family);
}

export function drawScanFitFormula(ctx, type, x, top, size, family, color) {
  const measured = layout(ctx, type, size, family);
  if (!measured.type) return measured;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.7, size * 0.055);
  if (type === 'amplitude') {
    const lhsBaseline = top + size * 1.3;
    const fractionX = x + measured.lhsWidth + measured.gap;
    const numeratorX = fractionX + (measured.fractionWidth - measured.numeratorWidth) / 2;
    const denominatorX = fractionX + (measured.fractionWidth - measured.denominatorWidth) / 2;
    drawSequence(ctx, measured.lhs, x, lhsBaseline, size, family, color, true);
    const numeratorBaseline = top + size * 0.92;
    drawSequence(ctx, measured.numeratorPrefix, numeratorX, numeratorBaseline, size, family, color, true);
    const numeratorRootX = numeratorX + measured.numeratorPrefixWidth + measured.numeratorGap;
    const numeratorRoot = drawRadical(ctx, numeratorRootX, numeratorBaseline, measured.numeratorTextWidth, size);
    drawSequence(ctx, measured.numerator, numeratorRoot.radicandX, numeratorBaseline, size, family, color, true);
    ctx.beginPath();
    ctx.moveTo(fractionX, top + size * 1.08);
    ctx.lineTo(fractionX + measured.fractionWidth, top + size * 1.08);
    ctx.stroke();
    drawSequence(ctx, measured.denominator, denominatorX, top + size * 1.84, size, family, color, true);
  } else {
    const baseline = top + size * 1.34;
    const rootX = x + measured.lhsWidth + measured.gap;
    const radicandX = rootX + measured.radicalWidth * 0.78;
    drawSequence(ctx, measured.lhs, x, baseline, size, family, color, true);
    drawRadical(ctx, rootX, baseline, measured.radicandWidth, size * 1.12);
    drawSequence(ctx, measured.radicand, radicandX, baseline, size, family, color, true);
    drawSequence(ctx, [text(' + C')], radicandX + measured.radicandWidth + size * 0.18,
      baseline, size, family, color, true);
  }
  ctx.restore();
  return measured;
}
