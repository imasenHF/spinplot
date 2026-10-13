// Shared 2D data container for heatmap, contour and stack rendering.

export function create2DData({ x, y, matrix, metadata = {} }) {
  return {
    type: '2D',
    x: { values: x || [], unit: metadata.xUnit || '' },
    y: { values: y || [], unit: metadata.yUnit || '' },
    matrix: matrix || [],
    metadata
  };
}

export function validate2DData(data) {
  return !!(
    data &&
    data.type === '2D' &&
    Array.isArray(data.matrix)
  );
}
