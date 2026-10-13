import { interp1 } from "../processing/interpolation.js";
import { axisKind } from "../processing/axis.js";
import { autoRangeX } from "../plotting/oned.js";
function csvEscape(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
export function globalCurvesCSV(cs) {
  if (
    new Set(
      cs.map(
        (c) =>
          axisKind(c.xAxis || { name: "Field", unit: "G" }) +
          ":" +
          (c.xAxis?.unit || "G"),
      ),
    ).size > 1
  ) {
    const rows = [["curve", "axis", "unit", "coordinate", "intensity"]];
    for (const c of cs)
      for (let i = 0; i < c.B.length; i++)
        rows.push([
          c.name,
          c.xAxis?.name || "Field",
          c.xAxis?.unit || "G",
          c.B[i],
          c.y[i],
        ]);
    return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  }
  const Bref = cs[0].B.slice(),
    rows = [
      [
        cs[0].xAxis && axisKind(cs[0].xAxis) !== "field"
          ? cs[0].xAxis.name + " (" + cs[0].xAxis.unit + ")"
          : "B",
        ...cs.map((c) => c.name),
      ],
    ];
  const ys = cs.map((c) => interp1(c.B, c.y, Bref));
  for (let i = 0; i < Bref.length; i++)
    rows.push([Bref[i], ...ys.map((y) => y[i])]);
  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
}
export function displayCurvesCSV(subplots, controls) {
  const $ = (id) => ({ value: controls[id] });
  const rows = [
    [
      "subplot",
      "subplot_title",
      "curve_index",
      "curve",
      "source",
      "freq_source_GHz",
      "freq_target_GHz",
      "freq_source_status",
      "field_scale",
      "baseline_mode",
      "baseline_regions_G",
      "baseline_reference_G",
      "amplitude_mode",
      "amplitude_scale",
      "noise_regions_G",
      "stack_mode",
      "stack_offset",
      "coordinate",
      "Y_display",
      "axis_name",
      "axis_unit",
    ],
  ];
  subplots.forEach(({ sp, curves }, si) =>
    curves.forEach((c) => {
      for (let i = 0; i < c.B.length; i++)
        rows.push([
          si + 1,
          sp.title,
          c.index,
          c.name,
          c.source,
          c.freq ?? "",
          c.targetFreq ?? "",
          Number.isFinite(c.freq) ? "source" : "missing",
          c.scale,
          $("baselineMode").value,
          $("baselineRegions").value,
          $("baselineBref").value,
          $("scaleMode").value,
          c.ampScale ?? 1,
          sp.noiseRegions,
          sp.mode,
          c.offset,
          c.B[i],
          c.yd[i],
          c.xAxis?.name || "Field",
          c.xAxis?.unit || "G",
        ]);
    }),
  );
  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
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
