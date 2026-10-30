export const PLOT_FOOTPRINTS = Object.freeze({
  main: Object.freeze({ top: false, right: false }),
  top: Object.freeze({ top: true, right: false }),
  right: Object.freeze({ top: false, right: true }),
  full: Object.freeze({ top: true, right: true }),
});

export function normalizePlotFootprint(value) {
  return Object.hasOwn(PLOT_FOOTPRINTS, value) ? value : "full";
}

export function footprintProjectionFlags(value) {
  return PLOT_FOOTPRINTS[normalizePlotFootprint(value)];
}

export function applyPlotFootprint(settings, value) {
  const flags = footprintProjectionFlags(value);
  const enabled = settings?.showProjections !== false;
  return {
    ...settings,
    showProjections: enabled && (flags.top || flags.right),
    showXProjection: enabled && flags.top && settings?.showXProjection !== false,
    showYProjection: enabled && flags.right && settings?.showYProjection !== false,
  };
}

// Allocate row-specific auxiliary space while keeping every single-row
// subplot's main plotting frame at the same height.
export function fitMainRows(entries, rowCount, totalHeight) {
  const rows = Math.max(1, Math.floor(Number(rowCount) || 1));
  if (entries.some((entry) => Number(entry.rowSpan ?? 1) !== 1)) return null;
  const top = Array(rows).fill(0);
  const bottom = Array(rows).fill(0);
  for (const entry of entries) {
    const row = Math.floor(Number(entry.row)) - 1;
    if (row < 0 || row >= rows) continue;
    const t = Number(entry.insets?.top);
    const b = Number(entry.insets?.bottom);
    if (Number.isFinite(t)) top[row] = Math.max(top[row], Math.max(0, t));
    if (Number.isFinite(b)) bottom[row] = Math.max(bottom[row], Math.max(0, b));
  }
  const extra = top.reduce((sum, value, i) => sum + value + bottom[i], 0);
  const mainHeight = (Number(totalHeight) - extra) / rows;
  if (!Number.isFinite(mainHeight) || mainHeight <= 35)
    throw new Error("Canvas too small for current subplot layout");
  return {
    mainHeight,
    heights: top.map((value, i) => mainHeight + value + bottom[i]),
    insets: top.map((value, i) => ({ top: value, bottom: bottom[i] })),
  };
}
