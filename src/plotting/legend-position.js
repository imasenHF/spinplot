// Resolve one-dimensional and Variable scan curve-legend placement.
// Explicit positions saved in legacy projects retain their original meaning.
const positions = new Set([
  'upper_left','upper_center','upper_right',
  'center_left','center','center_right',
  'lower_left','lower_center','lower_right',
  'outside_right','outside_top'
]);

export function resolveLegendPosition(local, globalPosition = 'upper_right') {
  const chosen = local == null || local === '' || local === 'inherit'
    ? globalPosition
    : local;
  // Existing "auto" behaved as upper_right before global inheritance existed.
  if (chosen === 'auto') return 'upper_right';
  return positions.has(chosen) ? chosen : 'upper_right';
}

/**
 * Existing configurations had no global placement setting. Their implicit
 * upper-right default becomes inherited without changing the initial image.
 * Explicit alternative positions retain their meaning.
 */
export function migrateLegacyLegendPosition(local, controls) {
  if (local === 'upper_right' && !Object.hasOwn(controls ?? {}, 'globalLegendPosition')) {
    return 'inherit';
  }
  return local;
}
