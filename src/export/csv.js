// CSV export helpers

export function curvesToCSV(curves) {
  const rows = [['index', 'x', 'y']];
  curves.forEach((curve, index) => {
    const x = curve.x || curve.B || [];
    const y = curve.yDisplay || curve.y || [];
    x.forEach((value, i) => rows.push([index, value, y[i] ?? '']));
  });
  return rows.map(row => row.join(',')).join('\n');
}
