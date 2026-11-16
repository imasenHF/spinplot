import { autoRangeX } from "../plotting/oned.js";
function csvEscape(v) {
  const s = String(v ?? "");
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
const axisTitle = (axis) => axis.unit ? `${axis.name} (${axis.unit})` : axis.name;

export function heatmapXYZCSV({ v, xi, yi }, component) {
  const header = [axisTitle(v.x), axisTitle(v.y), `Signal (${component})`];
  const lines = [header.map(csvEscape).join(",")];
  for (const j of yi) {
    for (const i of xi) {
      const z = v.z[j][i];
      lines.push([v.x.values[i], v.y.values[j], Number.isFinite(z) ? z : ""].join(","));
    }
  }
  return lines.join("\n");
}
export function sourceMatrixCSV(datasets) {
  const header = [
    'dataset_index',
    'dataset',
    'trace_index',
    'point_index',
    'x_axis',
    'x_unit',
    'x',
    'y_axis',
    'y_unit',
    'y',
    'signal_real',
    'signal_imag',
  ];
  const lines = [header.join(',')];
  datasets.forEach((dataset, index) => {
    const { matrix } = dataset;
    const prefix = [index + 1, dataset.name];
    if (!matrix) return;
    matrix.y.values.forEach((y, trace) => {
      matrix.x.values.forEach((x, point) => {
        lines.push(
          [
            ...prefix,
            trace + 1,
            point + 1,
            matrix.x.name,
            matrix.x.unit,
            x,
            matrix.y.name,
            matrix.y.unit,
            y,
            matrix.real[trace][point],
            matrix.imag?.[trace]?.[point],
          ]
            .map(csvEscape)
            .join(','),
        );
      });
    });
  });
  return lines.join('\n');
}
// Each column block has its own sample order and length. Only curves with
// identical displayed grids in the same subplot share an X column.
export function plotDataCSV(subplots) {
  const columns = [];
  for (const { sp, index, curves, xmin, xmax, matrixView } of subplots) {
    const prefix = sp.title?.trim() || `S${index + 1}`;
    if (matrixView) {
      const { v, xi, yi } = matrixView;
      const x = [], y = [], z = [];
      for (const j of yi) {
        for (const i of xi) {
          x.push(v.x.values[i]);
          y.push(v.y.values[j]);
          z.push(v.z[j][i]);
        }
      }
      if (x.length) {
        columns.push(
          { label: `${prefix} X · ${axisTitle(v.x)}`, values: x },
          { label: `${prefix} Y · ${axisTitle(v.y)}`, values: y },
          { label: `${prefix} Z · ${sp.twoD.settings.component}`, values: z },
        );
      }
      continue;
    }
    const grids = [];
    const names = new Set();
    curves.forEach((curve, curveIndex) => {
      const x = [], y = [];
      for (let i = 0; i < Math.min(curve.B.length, curve.yd.length); i++) {
        const coordinate = curve.B[i];
        if (Number.isFinite(coordinate) && coordinate >= xmin && coordinate <= xmax) {
          x.push(coordinate);
          y.push(curve.yd[i]);
        }
      }
      if (!x.length) return;
      const axis = curve.xAxis || { name: 'Field', unit: 'G' };
      const name = curve.name?.trim() || `Curve ${curveIndex + 1}`;
      let label = `${prefix} · ${name}`;
      for (let n = 2; names.has(label); n++) label = `${prefix} · ${name} (${n})`;
      names.add(label);
      const grid = grids.find((g) => g.axis.name === axis.name && g.axis.unit === axis.unit &&
        g.x.length === x.length && g.x.every((value, i) => value === x[i]));
      const yColumn = { label: `${label} Y`, values: y };
      if (grid) {
        grid.yColumns.push(yColumn);
      } else {
        grids.push({ axis, x, label, yColumns: [yColumn] });
      }
    });
    for (const { axis, x, label, yColumns } of grids) {
      const suffix = axis.unit ? ` (${axis.unit})` : '';
      const xLabel = yColumns.length > 1 ? prefix : label;
      columns.push({ label: `${xLabel} X${suffix}`, values: x }, ...yColumns);
    }
  }
  if (!columns.length) return '';
  // User-defined plot and curve titles are text, even in spreadsheet readers.
  const labels = new Set();
  const header = columns.map(({ label }) => {
    let unique = label;
    for (let n = 2; labels.has(unique); n++) unique = `${label} (${n})`;
    labels.add(unique);
    return csvEscape(/^[=+@-]/.test(unique) ? "'" + unique : unique);
  });
  const lines = [header.join(',')];
  const rowCount = columns.reduce((max, column) => Math.max(max, column.values.length), 0);
  for (let i = 0; i < rowCount; i++) {
    lines.push(columns.map(({ values }) => Number.isFinite(values[i]) ? values[i] : '').join(','));
  }
  return lines.join('\n');
}

export function frequencyMetadataCSV(rawCurves, target, controls) {
  const $ = (id) => ({ value: controls[id], checked: controls[id] });
  const rows = [
    [
      "file",
      "curve",
      "freq_raw_GHz",
      "freq_source_status",
      "global_target_GHz",
      "global_mode",
      "manual_frequency_confirmed",
      "global_scale",
      "N_points",
      "B_min_raw",
      "B_max_raw",
    ],
  ];
  rawCurves.forEach((c) =>
    rows.push([
      c.source,
      c.name,
      c.freq ?? "",
      Number.isFinite(c.freq) ? "source" : "missing",
      target ?? "",
      $("globalFreqMode").value,
      $("confirmManualFrequency").checked,
      target && Number.isFinite(c.freq) ? target / c.freq : 1,
      c.y.length,
      ...autoRangeX([c]),
    ]),
  );
  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
}
