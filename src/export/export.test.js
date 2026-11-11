import test from "node:test";
import assert from "node:assert/strict";
import { globalCurvesCSV, displayCurvesCSV, heatmapXYZCSV } from "./csv.js";
import { defaults, model } from "../twod/ui.js";
import { parseCSV, parseMergedCSV } from "../data/csv.js";
import { svgFromScene } from "./svg.js";
import { vectorScene } from "./scene.js";
import { exportProjectPayload, exportConfigPayload } from "./project.js";
import { parseProjectCurves } from "../project/project.js";
test("legacy and multi-curve CSV roundtrip; quote names and missing values", () => {
  for (const input of [
    "B,old\r\n3300,1\r\n3320,-1\r\n",
    'B,"A,quoted",B\n3300,1,2\n3320,3,6\n',
  ]) {
    const c = parseMergedCSV(input, "sample.csv");
    const output = globalCurvesCSV(c);
    const loaded = parseMergedCSV(output, "roundtrip.csv");
    assert.deepEqual(
      loaded.map((c) => [c.B, c.y]),
      c.map((c) => [c.B, c.y]),
    );
  }
  const mixed = [
    { name: "f", B: [1, 2], y: [3, 4] },
    { name: "t", B: [1, 2], y: [5, 6], xAxis: { name: "Time", unit: "ms" } },
  ];
  assert.deepEqual(parseCSV(globalCurvesCSV(mixed))[0], [
    "curve",
    "axis",
    "unit",
    "coordinate",
    "intensity",
  ]);
});
test("global CSV exports every matrix cell and preserves 1D datasets in mixed projects", () => {
  const matrix = {
    x: { name: "Field", unit: "G", values: [3401, 3398, 3390] },
    y: { name: "Microwave attenuation", unit: "dB", values: [6, 15] },
    real: [[-2, 0, 3], [4, 5, -6]],
    imag: [[1, 2, 3], [0, -1, -2]],
  };
  const [header, ...rows] = parseCSV(globalCurvesCSV([
    { name: 'Map, "quoted"', B: [1], y: [99], matrix },
    { name: "Single", B: [3395], y: [-7] },
  ]));
  assert.deepEqual(header, [
    "dataset_index", "dataset", "trace_index", "point_index",
    "x_axis", "x_unit", "x", "y_axis", "y_unit", "y",
    "signal_real", "signal_imag",
  ]);
  assert.equal(rows.length, 7);
  assert.deepEqual(rows[0], [
    "1", 'Map, "quoted"', "1", "1", "Field", "G", "3401",
    "Microwave attenuation", "dB", "6", "-2", "1",
  ]);
  assert.deepEqual(rows[5], [
    "1", 'Map, "quoted"', "2", "3", "Field", "G", "3390",
    "Microwave attenuation", "dB", "15", "-6", "-2",
  ]);
  assert.deepEqual(rows[6], [
    "2", "Single", "", "1", "Field", "G", "3395", "", "", "", "-7", "",
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
test("display export uses yd and records offset, raw global export uses y", () => {
  const c = {
    index: 0,
    name: "c",
    source: "s",
    B: [1, 2],
    y: [3, 4],
    yd: [8, 9],
    offset: 5,
    scale: 1,
  };
  const rows = parseCSV(
    displayCurvesCSV([{ sp: { mode: "stack" }, curves: [c] }], {}),
  );
  assert.equal(rows[1][rows[0].indexOf("Y_display")], "8");
  assert.equal(rows[1][rows[0].indexOf("stack_offset")], "5");
  assert.match(globalCurvesCSV([c]), /1,3/);
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
