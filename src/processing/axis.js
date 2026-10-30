import { parseNumberList } from "../core/numeric.js";
// SpinPlot axis conversion utilities

const PLANCK = 6.62607015e-34;
const BOHR_MAGNETON = 9.2740100783e-24;

export function fieldToG(fieldTesla, frequencyHz) {
  return (PLANCK * frequencyHz) / (BOHR_MAGNETON * fieldTesla);
}

export function gToField(g, frequencyHz) {
  return (PLANCK * frequencyHz) / (BOHR_MAGNETON * g);
}

export function frequencyScaleAxis(values, rawFrequency, targetFrequency) {
  const ratio = targetFrequency / rawFrequency;
  return values.map((v) => v * ratio);
}

export function normalizeAxis(values, ascending = true) {
  const out = [...values];
  if (ascending && out.length > 1 && out[0] > out[out.length - 1])
    return out.reverse();
  if (!ascending && out.length > 1 && out[0] < out[out.length - 1])
    return out.reverse();
  return out;
}

export function gFromB(B, nu) {
  return (PLANCK * (nu * 1e9)) / (BOHR_MAGNETON * B * 1e-4);
}
export function BFromG(g, nu) {
  return (PLANCK * (nu * 1e9)) / (BOHR_MAGNETON * g) / 1e-4;
}

export function bes3tFieldToGauss(v, unit) {
  const u = String(unit || "G")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  if (["g", "gauss"].includes(u)) return v;
  if (["mt", "millitesla"].includes(u)) return v * 10;
  if (["t", "tesla"].includes(u)) return v * 10000;
  return v;
}

export function coordinateScale(c, target) {
  return !c.matrix &&
    (!c.xAxis || axisKind(c.xAxis) === "field") &&
    target &&
    Number.isFinite(c.freq) &&
    c.freq > 0
    ? target / c.freq
    : 1;
}

export function axisKind(a) {
  const n = String(a.name || "").toLowerCase(),
    u = String(a.unit || "")
      .trim()
      .toLowerCase();
  if (/modul|调制/.test(n)) return "modulation";
  if (/field|magnetic|磁场/.test(n) || /^(g|gauss|mt|t|oe)$/.test(u))
    return "field";
  if (/time|delay|时间|延迟/.test(n) || /^(s|ms|us|µs|μs|ns|ps)$/.test(u))
    return "time";
  if (/power|atten|功率|衰减/.test(n) || /^(w|mw|uw|µw|db|dbm)$/.test(u))
    return "power";
  if (/angle|rotation|角度/.test(n) || /^(deg|degree|degrees|°|rad)$/.test(u))
    return "angle";
  if (/temp|温度/.test(n) || /^(k|c|°c|°f|celsius|fahrenheit)$/.test(u))
    return "temperature";
  return "other";
}

export function axisInfo(a) {
  if (!a.name || /^[XYZ]$/i.test(a.name))
    a.name =
      {
        field: "Field",
        time: "Time",
        power: "Power",
        angle: "Angle",
        temperature: "Temperature",
        modulation: "Modulation amplitude",
      }[axisKind(a)] || a.name;
  return a;
}

export function fieldToGauss(a) {
  if (axisKind(a) !== "field") return null;
  const u = String(a.unit || "")
    .trim()
    .toLowerCase();
  return { g: 1, gauss: 1, oe: 1, mt: 10, t: 10000 }[u] ?? null;
}

export function alignedCurve(c, index, target) {
  const scale = coordinateScale(c, target);
  return {
    xAxis: c.xAxis,
    index,
    name: c.name,
    source: c.source,
    freq: c.freq,
    targetFreq: target,
    scale,
    B: c.B.map((v) => v * scale),
    y: c.y.slice(),
  };
}
export function gFromCoordinate(b, nu, factor) {
  return (PLANCK * nu * 1e9) / (BOHR_MAGNETON * b * factor * 1e-4);
}
export function coordinateFromG(g, nu, factor) {
  return (PLANCK * nu * 1e9) / (BOHR_MAGNETON * g * factor * 1e-4);
}

export function axisEps(min, max, step = 0) {
  return Math.max(1e-12, Math.abs(max - min) * 1e-10, Math.abs(step) * 1e-10);
}

export function niceTicks(min, max, n = 5) {
  const span = max - min;
  if (!(span > 0)) return [min];
  const raw = span / n,
    p = Math.pow(10, Math.floor(Math.log10(raw))),
    e = raw / p,
    step = (e < 1.5 ? 1 : e < 3 ? 2 : e < 7 ? 5 : 10) * p,
    a = Math.ceil((min - axisEps(min, max, step)) / step) * step,
    o = [],
    eps = axisEps(min, max, step);
  for (let v = a, k = 0; v <= max + eps && k < 10000; v += step, k++) {
    const vv = Math.abs(v) < eps ? 0 : v;
    if (vv >= min - eps && vv <= max + eps) o.push(vv);
  }
  return o;
}

export function ticksWithStep(min, max, step, n = 5) {
  if (Number.isFinite(step) && step > 0) {
    const eps = axisEps(min, max, step),
      a = Math.ceil((min - eps) / step) * step,
      o = [];
    for (let v = a, k = 0; v <= max + eps && k < 10000; v += step, k++) {
      const vv = Math.abs(v) < eps ? 0 : v;
      if (vv >= min - eps && vv <= max + eps) o.push(vv);
    }
    return o;
  }
  return niceTicks(min, max, n);
}

export function minorTicks(min, max, major) {
  let step = major.length > 1 ? Math.abs(major[1] - major[0]) : (max - min) / 5;
  if (!(step > 0)) return [];
  const ms = step / 5,
    eps = axisEps(min, max, ms),
    a = Math.ceil((min - eps) / ms) * ms,
    out = [];
  for (let v = a, k = 0; v <= max + eps && k < 20000; v += ms, k++) {
    const vv = Math.abs(v) < eps ? 0 : v;
    if (vv < min - eps || vv > max + eps) continue;
    if (major.some((m) => Math.abs(m - vv) < ms * 1e-4)) continue;
    out.push(vv);
  }
  return out;
}

export function configuredGTicks(lo, hi, g) {
  if (g.mode === "manual_custom")
    return parseNumberList(g.ticks).filter((v) => v >= lo && v <= hi);
  if (g.mode === "manual_uniform")
    return ticksWithStep(Math.max(lo, g.min), Math.min(hi, g.max), g.step, 5);
  return niceTicks(lo, hi, 5);
}
