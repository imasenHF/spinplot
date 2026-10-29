// Stable virtual curve identities used by the direct-2D Variable scan.
export const SCAN_DERIVED_IDS = Object.freeze({
  statistic: -100,
  amplitude: -101,
  linewidth: -102,
  amplitudeFit: -103,
  linewidthFit: -104,
  excludedAmplitude: -105,
  excludedLinewidth: -106,
});

// Order is back-to-front: the last curve is drawn over earlier curves.
// The source 2D matrix is never part of this list or the drawing order.
const DEFAULT_ORDER = Object.freeze(Object.values(SCAN_DERIVED_IDS));
const ALLOWED = new Set(DEFAULT_ORDER);

export function normalizeScanDerivedOrder(saved) {
  const result = [];
  if (Array.isArray(saved)) {
    for (const value of saved) {
      if (typeof value === 'number' && ALLOWED.has(value) && !result.includes(value))
        result.push(value);
    }
  }
  for (const id of DEFAULT_ORDER) if (!result.includes(id)) result.push(id);
  return result;
}

export function moveScanDerivedOrder(saved, from, to) {
  const result = normalizeScanDerivedOrder(saved);
  if (!ALLOWED.has(from) || !ALLOWED.has(to) || from === to) return result;
  const source = result.indexOf(from), destination = result.indexOf(to);
  result.splice(source, 1);
  result.splice(destination, 0, from);
  return result;
}

export function sortScanDerived(items, saved, idOf = item => item.index) {
  const indices = new Map(normalizeScanDerivedOrder(saved).map((id, i) => [id, i]));
  return [...items].sort((a, b) =>
    (indices.get(idOf(a)) ?? Infinity) - (indices.get(idOf(b)) ?? Infinity));
}
