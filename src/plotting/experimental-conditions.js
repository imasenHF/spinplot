import { normalizeConditions } from '../data/experimental-conditions.js';

export function conditionBoxLayout(rows, input, geom, measure) {
  const config = normalizeConditions(input);
  if (!config.enabled || !rows.length || geom.pw <= 12 || geom.ph <= 8) return null;
  const rowHeight = config.size * 1.45;
  const naturalWidth = Math.max(30, ...rows.map(row => measure(row.text))) + 16;
  const naturalHeight = rows.length * rowHeight + 10;
  const scale = Math.min(1, (geom.pw - 12) / naturalWidth, (geom.ph - 8) / naturalHeight);
  const width = naturalWidth * scale, height = naturalHeight * scale;
  const horizontal = config.position.includes('left') ? 0 : config.position.includes('right') ? 1 : 0.5;
  const vertical = config.position.startsWith('upper') ? 0 : config.position.startsWith('lower') ? 1 : 0.5;
  const x = config.position === 'custom' ? config.x / 100 : horizontal;
  const y = config.position === 'custom' ? config.y / 100 : vertical;
  return { left: geom.x0 + 6 + x * Math.max(0, geom.pw - width - 12),
    top: geom.y0 + 4 + y * Math.max(0, geom.ph - height - 8),
    width, height, naturalWidth, naturalHeight, scale, rowHeight, size: config.size };
}
export function drawConditions(ctx, rows, input, geom, font, theme) {
  if (!input?.enabled || !rows?.length) return;
  const config = normalizeConditions(input);
  ctx.save(); ctx.font = `${config.size}px ${font}`;
  const box = conditionBoxLayout(rows, config, geom, text => ctx.measureText(text).width);
  if (!box) { ctx.restore(); return; }
  ctx.beginPath(); ctx.rect(geom.x0, geom.y0, geom.pw, geom.ph); ctx.clip();
  ctx.translate(box.left, box.top); ctx.scale(box.scale, box.scale);
  if (config.opacity > 0) {
    ctx.fillStyle = theme.bg === '#11181b' ? `rgba(17,24,27,${config.opacity})` : `rgba(255,255,255,${config.opacity})`;
    ctx.fillRect(0, 0, box.naturalWidth, box.naturalHeight);
  }
  if (config.border) { ctx.strokeStyle = theme.axis; ctx.lineWidth = 0.8; ctx.strokeRect(0, 0, box.naturalWidth, box.naturalHeight); }
  ctx.fillStyle = theme.text; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  rows.forEach((row, index) => ctx.fillText(row.text, 8, 5 + index * box.rowHeight));
  ctx.restore();
}
