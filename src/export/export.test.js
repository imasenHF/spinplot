import test from "node:test";
import assert from "node:assert/strict";
import { globalCurvesCSV, displayCurvesCSV } from "./csv.js";
import { parseCSV, parseMergedCSV } from "../data/csv.js";
import { svgFromScene } from "./svg.js";
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
