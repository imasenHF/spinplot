export const EMPTY_PROJECTION_SPACES = Object.freeze({
  none: Object.freeze({ top: false, right: false }),
  top: Object.freeze({ top: true, right: false }),
  right: Object.freeze({ top: false, right: true }),
  both: Object.freeze({ top: true, right: true }),
});

export function normalizeEmptyProjectionSpace(value) {
  return Object.hasOwn(EMPTY_PROJECTION_SPACES, value) ? value : "none";
}

export function emptyProjectionSpaceFlags(value) {
  return EMPTY_PROJECTION_SPACES[normalizeEmptyProjectionSpace(value)];
}

// Shared row/column insets keep subplot axes aligned by default. A subplot may
// opt into the unused projection area, but only when that projection is absent
// from this subplot. Natural insets retain titles, g axes, colorbars and legends.
export function resolveMainInsets(natural, shared, value) {
  const flags = emptyProjectionSpaceFlags(value),
    hasTopProjection = natural.hasTopProjection === true,
    hasRightProjection = natural.hasRightProjection === true,
    resolved = { ...natural, ...shared };
  if (flags.top && !hasTopProjection) resolved.top = natural.top;
  if (flags.right && !hasRightProjection) resolved.right = natural.right;
  return resolved;
}

// Allocate row-specific auxiliary space while keeping every single-row
// subplot's main plotting frame at the same height by default.
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
