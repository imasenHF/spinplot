import test from "node:test";
import assert from "node:assert/strict";
import { plotDataCSV, sourceMatrixCSV, heatmapXYZCSV } from "./csv.js";
import { defaults, model } from "../twod/ui.js";
import { parseCSV, parseMergedCSV } from "../data/csv.js";
import { svgFromScene } from "./svg.js";
import { vectorScene } from "./scene.js";
import { exportProjectPayload, exportConfigPayload } from "./project.js";
import { parseProjectCurves } from "../project/project.js";
test("matching plot grids export a CSV readable by the existing 1D importer", () => {
  const curves = parseMergedCSV('B,"A,quoted",B\n3300,1,2\n3320,3,6\n', "sample.csv");
  const csv = plotDataCSV([{
    index: 0, sp: {}, xmin: 3300, xmax: 3320,
    curves: curves.map(curve => ({ ...curve, yd: curve.y })),
  }]);
  assert.deepEqual(parseCSV(csv)[0], ["S1 X (G)", "S1 · A,quoted Y", "S1 · B Y"]);
  const loaded = parseMergedCSV(csv, "roundtrip.csv");
  assert.deepEqual(loaded.map(c => [c.B, c.y]), curves.map(c => [c.B, c.y]));
});
test("2D source CSV exports every matrix cell in mixed projects", () => {
  const matrix = {
    x: { name: "Field", unit: "G", values: [3401, 3398, 3390] },
    y: { name: "Microwave attenuation", unit: "dB", values: [6, 15] },
    real: [[-2, 0, 3], [4, 5, -6]],
    imag: [[1, 2, 3], [0, -1, -2]],
  };
  const [header, ...rows] = parseCSV(sourceMatrixCSV([
    { name: 'Map, "quoted"', B: [1], y: [99], matrix },
    { name: "Single", B: [3395], y: [-7] },
  ]));
  assert.deepEqual(header, [
    "dataset_index", "dataset", "trace_index", "point_index",
    "x_axis", "x_unit", "x", "y_axis", "y_unit", "y",
    "signal_real", "signal_imag",
  ]);
  assert.equal(rows.length, 6);
  assert.deepEqual(rows[0], [
    "1", 'Map, "quoted"', "1", "1", "Field", "G", "3401",
    "Microwave attenuation", "dB", "6", "-2", "1",
  ]);
  assert.deepEqual(rows[5], [
    "1", 'Map, "quoted"', "2", "3", "Field", "G", "3390",
    "Microwave attenuation", "dB", "15", "-6", "-2",
  ]);

});
test("heatmap XYZ uses selected component and orientation within the display ranges", () => {
  const matrix = {
    x: { name: "Field", unit: "G", values: [3400, 3410, 3420] },
    y: { name: "Microwave attenuation", unit: "dB", values: [6, 15] },
    real: [[3, 8, 5], [0, 12, 7]],
    imag: [[4, 15, 12], [2, 5, 24]],
  };
  const settings = {
    ...defaults(matrix), component: "magnitude", swap: true,
    xMin: 5, xMax: 16, yMin: 3405, yMax: 3420,
    projectionXMin: 6, projectionXMax: 15,
    projectionYMin: 3400, projectionYMax: 3420,
  };
  assert.deepEqual(parseCSV(heatmapXYZCSV(model(matrix, settings), settings.component)), [
    ["Microwave attenuation (dB)", "Field (G)", "Signal (magnitude)"],
    ["6", "3410", "17"],
    ["15", "3410", "13"],
    ["6", "3420", "13"],
    ["15", "3420", "25"],
  ]);
});
test("plot CSV keeps independently sampled grids and pads only short columns", () => {
  const [header, ...rows] = parseCSV(plotDataCSV([
    {
      index: 0, sp: { title: "Crop" }, xmin: 2, xmax: 4,
      curves: [
        { name: "A", B: [1, 2, 3, 4, 5], y: [0, 0, 0, 0, 0], yd: [7, 8, 9, 10, 11] },
        { name: "B", B: [2.1, 3.1], yd: [20, 21] },
        { name: "C", B: [2, 3, 4], yd: [30, NaN, 32] },
      ],
    },
    {
      index: 1, sp: {}, xmin: 2, xmax: 4,
      curves: [{ name: "D", B: [2, 3, 4], yd: [40, 41, 42] }],
    },
  ]));
  assert.deepEqual(header, ["Crop X (G)", "Crop · A Y", "Crop · C Y",
    "Crop · B X (G)", "Crop · B Y", "S2 · D X (G)", "S2 · D Y"]);
  assert.deepEqual(rows, [
    ["2", "8", "30", "2.1", "20", "2", "40"],
    ["3", "9", "", "3.1", "21", "3", "41"],
    ["4", "10", "32", "", "", "4", "42"],
  ]);
});
test("vector scene applies Canvas scale transforms to text and paths", () => {
  const { scene } = vectorScene({ width: 100, height: 50 },
    { font: "12px Arial", measureText: value => ({ width: String(value).length * 6 }) },
    canvas => {
      const ctx = canvas.getContext("2d");
      ctx.translate(10, 5);
      ctx.scale(2, 3);
      ctx.fillText("tabbed", 4, 6);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(5, 5);
      ctx.stroke();
    });
  assert.deepEqual(scene[0].m, [2, 0, 0, 3, 10, 5]);
  assert.equal(scene[0].x, 4);
  assert.equal(scene[0].y, 6);
  assert.match(scene[1].d, /M 10 5 L 20 20/);
});

test("SVG serializes vector paths, clipping, transformed Unicode and escaping", () => {
  const svg = svgFromScene({
    design: { width: 500, height: 300 },
    scene: [
      {
        type: "path",
        d: "M 0 0 L 1 1",
        stroke: "#000",
        width: 1,
        dash: [],
        clip: { d: "M 0 0 L 4 4" },
      },
      {
        type: "text",
        text: "中文 A&B <g>",
        x: 2,
        y: 3,
        m: [1, 0, 0, 1, 0, 0],
        font: "12px Arial",
        fill: "#000",
      },
    ],
  });
  assert.match(svg, /clipPath/);
  assert.match(svg, /中文 A&amp;B &lt;g&gt;/);
  assert.match(svg, /width="500"/);
});
test("SVG serializes filled marker paths", () => {
  const svg = svgFromScene({
    design: { width: 20, height: 20 },
    scene: [{ type: "path", d: "M 2 2 L 8 2 L 8 8 Z", fill: "#fff" }],
  });
  assert.match(svg, /d="M 2 2 L 8 2 L 8 8 Z" fill="#fff"/);
});
test("project v11/config v10 roundtrip preserves source arrays", () => {
  const raw = [
      { name: "s", source: "s", freq: 9.5, B: [3300, 3400], y: [1, 2] },
    ],
    cfg = { version: 10, controls: {}, subplots: [{ curves: [0] }] };
  const json = JSON.parse(
    exportProjectPayload({ appVersion: "0.9.2", rawCurves: raw, config: cfg }),
  );
  assert.equal(json.version, 11);
  assert.equal(JSON.parse(exportConfigPayload(cfg)).version, 10);
  assert.deepEqual(parseProjectCurves(json)[0].y, [1, 2]);
});
